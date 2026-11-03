import { LANGUAGES, DEFAULT_LANG, t, wikiHost } from './languages.js';

const PAGE_SIZE = 10;
const MAX_WORDS = 5;
const WD_HOST = 'https://www.wikidata.org';

// Search modes. `perLang` projects have one edition per language; the others are global.
const PROJECTS = {
  wikidata:   { name: 'Wikidata',          host: () => WD_HOST },
  wikipedia:  { name: 'Wikipedia',         host: (l) => wikiHost(l), perLang: true },
  commons:    { name: 'Wikimedia Commons', host: () => 'https://commons.wikimedia.org', ns: '0|6|14' },
  wikivoyage: { name: 'Wikivoyage',        host: (l) => `https://${l}.wikivoyage.org`, perLang: true },
  wiktionary: { name: 'Wiktionary',        host: (l) => `https://${l}.wiktionary.org`, perLang: true },
  wikiquote:  { name: 'Wikiquote',         host: (l) => `https://${l}.wikiquote.org`, perLang: true },
  wikisource: { name: 'Wikisource',        host: (l) => `https://${l}.wikisource.org`, perLang: true }
};
const DEFAULT_MODE = 'wikidata';
const LEGACY_PROJECT = 'wikipedia'; // entries saved before the project modes existed

const DEFAULTS = {
  lang: DEFAULT_LANG,
  mode: DEFAULT_MODE,
  theme: 'system',
  saveHistory: true,
  history: [],
  saved: []
};

const $ = (s) => document.querySelector(s);

function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  n.append(...kids);
  return n;
}

function extLink(href, text, cls = '') {
  return el('a', { href, text, class: cls, target: '_blank', rel: 'noopener noreferrer' });
}

let S = { ...DEFAULTS };
let stack = [];
let current = null;
let loadToken = 0;
let myWindowId = null;
let lastPending = 0;
let toastTimer = 0;

const tr = (key, vars) => t(S.lang, key, vars);

/* ---------------------------------------------------------------- API */

async function api(base, params) {
  const url = new URL(`${base}/w/api.php`);
  const all = { format: 'json', formatversion: '2', origin: '*', ...params };
  for (const [k, v] of Object.entries(all)) url.searchParams.set(k, String(v));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) {
    const err = new Error(data.error.info || data.error.code);
    err.code = data.error.code;
    throw err;
  }
  return data;
}

function pageUrl({ project, lang, title, id }) {
  if (project === 'wikidata') return `${WD_HOST}/wiki/${id}`;
  return `${PROJECTS[project].host(lang)}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
}

/* ------------------------------------------------------------- Helpers */

function snippetNode(html) {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  const out = document.createDocumentFragment();
  (function walk(node, target) {
    node.childNodes.forEach((c) => {
      if (c.nodeType === Node.TEXT_NODE) target.append(c.textContent.replace(/<\/?nowiki\s*\/?>/gi, ''));
      else if (c.nodeType === Node.ELEMENT_NODE) {
        if (c.classList.contains('searchmatch')) target.append(el('mark', { text: c.textContent }));
        else walk(c, target);
      }
    });
  })(doc.body, out);
  return out;
}

function countWords(text) {
  const s = String(text || '').trim();
  if (!s) return 0;
  if (typeof Intl.Segmenter === 'function') {
    let n = 0;
    for (const x of new Intl.Segmenter(undefined, { granularity: 'word' }).segment(s)) if (x.isWordLike) n++;
    return n;
  }
  return s.split(/\s+/).length;
}

/* An item is { project, lang, title, id? }. */
const keyOf = (e) => (PROJECTS[e.project]?.perLang ? `${e.project}:${e.lang}:${e.title}` : `${e.project}:${e.id || e.title}`);
const isSaved = (e) => S.saved.some((s) => keyOf(s) === keyOf(e));

function badgeText(e) {
  const p = PROJECTS[e.project];
  return p?.perLang ? `${p.name} · ${e.lang.toUpperCase()}` : p?.name || e.project;
}

/* ----------------------------------------------------- View handling */

function setContent(...nodes) {
  stopSpeech();
  $('#content').replaceChildren(...nodes);
}

/* ------------------------------------------------------ Read aloud */

const SPEECH_LANGS = {
  en: 'en-US', id: 'id-ID', ms: 'ms-MY', ko: 'ko-KR', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', ja: 'ja-JP',
  zh: 'zh-CN', ar: 'ar-SA', nl: 'nl-NL', ru: 'ru-RU', th: 'th-TH', ta: 'ta-IN', he: 'he-IL'
};
let speaking = false;
let speechPaint = null;

function stopSpeech() {
  if (!speaking) return;
  speaking = false;
  speechSynthesis.cancel();
  speechPaint?.();
  speechPaint = null;
}

// Chrome cuts long utterances short, so read sentence-sized chunks.
function speechChunks(text) {
  const chunks = [];
  for (const s of text.match(/[^.!?。！？]+[.!?。！？]*\s*/g) || [text]) {
    if (chunks.length && chunks.at(-1).length + s.length < 200) chunks[chunks.length - 1] += s;
    else chunks.push(s);
  }
  return chunks;
}

// Voices load asynchronously; wait briefly for them instead of assuming the list is complete.
function loadVoices() {
  const now = speechSynthesis.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => resolve(speechSynthesis.getVoices());
    speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 1000);
  });
}

// segments: [{ text, lang }]. Each one is read with a voice for its own language.
// Only voices installed on the device are used: online voices (such as Chrome's "Google ..." voices) would
// send the text to their provider, which the privacy note says never happens.
async function toggleSpeech(segments, paint) {
  if (speaking) return stopSpeech();
  if (!('speechSynthesis' in window)) return toast(tr('noVoice'));

  const voices = (await loadVoices()).filter((v) => v.localService);
  const queue = [];
  for (const seg of segments) {
    const code = SPEECH_LANGS[seg.lang] || seg.lang;
    const voice = voices.find((v) => v.lang.replace('_', '-').toLowerCase() === code.toLowerCase())
      || voices.find((v) => v.lang.toLowerCase().startsWith(seg.lang));
    if (!voice) return toast(tr('noVoice'));
    for (const chunk of speechChunks(seg.text)) queue.push({ chunk, code, voice });
  }

  const done = () => {
    if (!speaking) return;
    speaking = false;
    speechPaint?.();
    speechPaint = null;
  };
  speaking = true;
  speechPaint = paint;
  paint();
  queue.forEach(({ chunk, code, voice }, i) => {
    const u = new SpeechSynthesisUtterance(chunk);
    u.lang = code;
    u.voice = voice;
    if (i === queue.length - 1) u.onend = done;
    u.onerror = done;
    speechSynthesis.speak(u);
  });
}

const stateNode = (text) => el('p', { class: 'state', text });

function begin(replace = false) {
  return { token: ++loadToken, prev: replace ? null : current, scroll: $('#main').scrollTop };
}

const viewKey = (v) => (!v ? '' : v.kind === 'results' ? `r:${v.project}:${v.lang}:${v.q}:${v.page}` : v.kind === 'entity' ? `e:${v.id}` : '');

function commit(ctx, view) {
  if (ctx.token !== loadToken) return false;
  if (ctx.prev && viewKey(ctx.prev) && viewKey(ctx.prev) === viewKey(view)) ctx.prev = null;
  if (ctx.prev) {
    ctx.prev.scroll = ctx.scroll;
    stack.push(ctx.prev);
    if (stack.length > 50) stack.shift();
  }
  current = view;
  $('#back').disabled = stack.length === 0;
  showTab('lookup');
  renderView(view);
  $('#main').scrollTop = 0;
  return true;
}

function fail(ctx, err, retry) {
  if (ctx.token !== loadToken) return;
  let message;
  if (err?.code === 'missingtitle') message = tr('notFound');
  else if (err instanceof TypeError) message = tr('errorNetwork');
  else message = tr('errorGeneric', { msg: err?.message || String(err) });
  commit(ctx, { kind: 'error', message, retry });
}

function renderView(v) {
  if (!v) return renderHome();
  if (v.kind === 'results') return renderResults(v);
  if (v.kind === 'entity') return renderEntity(v);
  if (v.kind === 'error') return renderError(v);
  renderHome();
}

// With an empty search box: explain what the selected project is for.
function renderHome() {
  setContent(
    el('section', { class: 'card modeinfo' },
      el('div', { class: 'modehead' }, projectIcon(S.mode), el('b', { text: PROJECTS[S.mode].name })),
      el('p', { dir: 'auto', text: tr('info_' + S.mode) })),
    stateNode(tr('homeHint'))
  );
}

// Forget the current results so the box shows the mode description again.
function resetToHome() {
  loadToken++;
  current = null;
  renderHome();
  $('#main').scrollTop = 0;
}

function renderError(v) {
  const nodes = [stateNode(v.message)];
  if (v.retry) nodes.push(el('div', { class: 'toolbar', style: 'justify-content:center' }, el('button', { class: 'btn', type: 'button', text: tr('retry'), onclick: v.retry })));
  setContent(...nodes);
}

// Bookmark icon: outline when not saved, filled when saved.
function bookmarkIcon(size, filled) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', 'M6.5 3h11A1.5 1.5 0 0 1 19 4.5V21l-7-4.2L5 21V4.5A1.5 1.5 0 0 1 6.5 3z');
  p.setAttribute('fill', filled ? 'currentColor' : 'none');
  p.setAttribute('stroke', 'currentColor');
  p.setAttribute('stroke-width', '2');
  p.setAttribute('stroke-linejoin', 'round');
  svg.append(p);
  return svg;
}

function starButton(entry) {
  const btn = el('button', { class: 'star', type: 'button' });
  const paint = () => {
    const on = isSaved(entry);
    btn.replaceChildren(bookmarkIcon(18, on));
    btn.classList.toggle('on', on);
    btn.title = tr(on ? 'saved' : 'save');
    btn.setAttribute('aria-label', btn.title);
  };
  btn.addEventListener('click', async () => {
    await toggleSave(entry);
    paint();
  });
  paint();
  return btn;
}

// Commons result preview: the file's thumbnail, or an icon for audio, categories and other files without one.
const MEDIA_ICONS = { AUDIO: '🔊', VIDEO: '🎬', OFFICE: '📄', BITMAP: '🖼️', DRAWING: '🖼️' };

function thumbBox(h) {
  const icon = h.title.startsWith('Category:') ? '📁' : MEDIA_ICONS[h.mediatype] || '📄';
  const box = el('span', { class: 'thumbbox', 'aria-hidden': 'true' }, icon);
  if (h.thumb) {
    const img = el('img', { src: h.thumb, alt: '', referrerpolicy: 'no-referrer' });
    img.addEventListener('load', () => box.replaceChildren(img), { once: true });
  }
  return box;
}

function resultItem(h) {
  const note = h.note || snippetNode(h.snippet).textContent.replace(/\s+/g, ' ').trim().slice(0, 160);
  const entry = {
    project: h.project, lang: h.lang, title: h.title,
    ...(h.id ? { id: h.id } : {}), ...(note ? { note } : {}),
    ...(h.thumb ? { thumb: h.thumb } : {}), ...(h.mediatype ? { mediatype: h.mediatype } : {})
  };
  const title = el('span', { class: 't', dir: 'auto' }, h.title);
  if (PROJECTS[h.project].perLang && h.lang !== h.reqLang) title.append(el('span', { class: 'badge', text: h.lang.toUpperCase() }));
  if (h.id) title.append(el('span', { class: 'badge', text: h.id }));
  const sub = el('span', { class: 's', dir: 'auto' });
  if (h.note) sub.append(h.note);
  else sub.append(snippetNode(h.snippet));

  const body = h.project === 'commons' ? [thumbBox(h), el('span', { class: 'ibody' }, title, sub)] : [title, sub];
  const cls = h.project === 'commons' ? 'item withthumb' : 'item';

  // Wikidata opens the in-panel detail view; every other project opens the page itself.
  const main = h.project === 'wikidata'
    ? el('button', { class: cls, type: 'button', onclick: () => openEntity(h.id) }, ...body)
    : el('a', { class: cls, href: pageUrl(entry), target: '_blank', rel: 'noopener noreferrer' }, ...body);
  return el('li', {}, main, starButton(entry));
}

const pageLabel = (v) => tr('pageN', { n: v.page + 1 }) + (v.pages ? ` / ${Math.max(v.pages, v.page + 1)}` : '');

function renderResults(v) {
  const p = PROJECTS[v.project];
  const edition = p.perLang ? ` (${(v.hits[0]?.lang || v.lang).toUpperCase()})` : '';
  const vars = { q: v.q, p: p.name + edition };
  const headText = v.hits.length ? tr('resultsForIn', vars) : tr('noResultsIn', vars);
  const nodes = [el('p', { class: 'banner', text: headText })];

  if (v.hits.length) nodes.push(el('ul', { class: 'list' }, ...v.hits.map(resultItem)));

  if (v.hits.length || v.page > 0) {
    const go = (page) => runSearch(v.q, { project: v.project, lang: v.lang, page, record: false, pages: v.pages });
    const prev = el('button', { class: 'btn', type: 'button', text: tr('prev'), onclick: () => go(v.page - 1) });
    const next = el('button', { class: 'btn', type: 'button', text: tr('next'), onclick: () => go(v.page + 1) });
    prev.disabled = v.page === 0;
    next.disabled = !v.hasMore;
    nodes.push(el('div', { class: 'pager' }, prev, el('span', { class: 'note pagelabel', text: pageLabel(v) }), next));
  }
  setContent(...nodes);
}

/* ------------------------------------------------------ Wikidata item */

const pick = (obj) => {
  if (!obj) return '';
  return (obj[S.lang] || Object.values(obj)[0])?.value || '';
};

// Project favicons, the same approach as Wikirekap: <domain>/favicon.ico with a Wikimedia fallback.
const FAVICON_DOMAINS = {
  wikidata: 'www.wikidata.org', wikipedia: 'en.wikipedia.org', commons: 'commons.wikimedia.org',
  wikivoyage: 'en.wikivoyage.org', wiktionary: 'en.wiktionary.org', wikiquote: 'en.wikiquote.org',
  wikisource: 'en.wikisource.org', wikibooks: 'en.wikibooks.org', wikiversity: 'en.wikiversity.org',
  wikinews: 'en.wikinews.org', species: 'species.wikimedia.org', meta: 'meta.wikimedia.org',
  all: 'meta.wikimedia.org'
};
const FALLBACK_ICON = 'https://upload.wikimedia.org/wikipedia/commons/8/81/Wikimedia-logo.svg';

function projectIcon(type) {
  const img = el('img', {
    class: 'picon', alt: '', loading: 'lazy', referrerpolicy: 'no-referrer',
    src: `https://${FAVICON_DOMAINS[type] || FAVICON_DOMAINS.all}/favicon.ico`
  });
  img.addEventListener('error', () => { img.src = FALLBACK_ICON; }, { once: true });
  return img;
}

const SITE_SUFFIXES = ['wiktionary', 'wikisource', 'wikibooks', 'wikiversity', 'wikivoyage', 'wikiquote', 'wikinews', 'wiki'];
const SITE_TYPES = { wiki: 'wikipedia' };
const GLOBAL_SITES = { commonswiki: 'commons', specieswiki: 'species', metawiki: 'meta' };
const SITE_NAMES = {
  wikipedia: 'Wikipedia', wiktionary: 'Wiktionary', wikisource: 'Wikisource', wikibooks: 'Wikibooks',
  wikiversity: 'Wikiversity', wikivoyage: 'Wikivoyage', wikiquote: 'Wikiquote', wikinews: 'Wikinews',
  commons: 'Wikimedia Commons', species: 'Wikispecies', meta: 'Meta-Wiki'
};
const SITE_ORDER = ['wikipedia', 'wiktionary', 'wikisource', 'wikibooks', 'wikiversity', 'wikivoyage', 'wikiquote', 'wikinews', 'commons', 'species', 'meta'];
const IW_PAGE_SIZE = 12;

const nameCache = {};
function langName(code, inLocale) {
  try {
    nameCache[inLocale] ||= new Intl.DisplayNames([inLocale], { type: 'language' });
    return nameCache[inLocale].of(code) || code;
  } catch {
    return code;
  }
}

// Turn Wikidata sitelinks into directory rows: { type, lang, title, url, name, native }.
function parseSitelinks(sitelinks) {
  const rows = [];
  for (const [key, s] of Object.entries(sitelinks || {})) {
    if (!s.url) continue;
    let type = GLOBAL_SITES[key];
    let lang = '';
    if (!type) {
      const kind = SITE_SUFFIXES.find((x) => key.endsWith(x) && key.length > x.length);
      if (!kind) continue;
      type = SITE_TYPES[kind] || kind;
      lang = key.slice(0, -kind.length).replace(/_/g, '-');
      // Skip non-language sites such as abstractwiki, mediawikiwiki, wikidatawiki.
      if (lang !== 'simple' && !/^[a-z]{2,3}(-[a-z0-9]+)*$/.test(lang)) continue;
    }
    rows.push({
      type, lang, title: s.title, url: s.url,
      name: lang ? langName(lang, S.lang) : SITE_NAMES[type],
      native: lang ? langName(lang, lang) : ''
    });
  }
  const isCurrent = (r) => (r.type === 'wikipedia' && r.lang === S.lang ? 0 : 1);
  rows.sort((a, b) =>
    isCurrent(a) - isCurrent(b) || SITE_ORDER.indexOf(a.type) - SITE_ORDER.indexOf(b.type) || a.name.localeCompare(b.name));
  return rows;
}

// Opening paragraph from the Wikipedia in the interface language, falling back to English.
async function fetchSummary(sitelinks) {
  for (const lang of S.lang === 'en' ? ['en'] : [S.lang, 'en']) {
    const title = sitelinks?.[`${lang.replace(/-/g, '_')}wiki`]?.title;
    if (!title) continue;
    const path = encodeURIComponent(title.replace(/ /g, '_'));
    try {
      const res = await fetch(`${wikiHost(lang)}/api/rest_v1/page/summary/${path}`, { headers: { Accept: 'application/json' } });
      if (!res.ok) continue;
      const d = await res.json();
      if (d.extract) return { lang, extract: d.extract, url: d.content_urls?.desktop?.page || `${wikiHost(lang)}/wiki/${path}` };
    } catch { /* try the next language */ }
  }
  return null;
}

// `replace` re-loads the item in place (used when the language changes) without adding a back step.
async function openEntity(id, { replace = false, iw = null } = {}) {
  const ctx = begin(replace);
  showLoading();
  try {
    const d = await api(WD_HOST, {
      action: 'wbgetentities', ids: id, props: 'labels|descriptions|sitelinks/urls',
      languages: S.lang, languagefallback: 1
    });
    const ent = d.entities?.[id];
    if (!ent || ent.missing) {
      const err = new Error('missing');
      err.code = 'missingtitle';
      throw err;
    }
    const summary = await fetchSummary(ent.sitelinks);
    commit(ctx, {
      kind: 'entity', id, ent, summary, rows: parseSitelinks(ent.sitelinks),
      iw: iw || { open: false, filter: 'all', q: '', page: 1 }
    });
  } catch (err) {
    fail(ctx, err, () => openEntity(id, { replace, iw }));
  }
}

function card(title, ...kids) {
  return el('section', { class: 'card' }, el('h2', { class: 'sec', text: title }), ...kids);
}

// Interwiki directory: collapsed by default, project filter chips, search, 12 per page.
function interwikiCard(v) {
  const st = v.iw;
  const root = el('section', { class: 'card' });

  const paint = () => {
    root.replaceChildren(
      el('button', { class: 'iwhead', type: 'button', 'aria-expanded': String(st.open), onclick: () => { st.open = !st.open; paint(); } },
        el('span', { class: 'sec', text: `${tr('wdInterwiki')} (${v.rows.length})` }),
        el('span', { class: 'btn', text: st.open ? tr('wdHide') : tr('wdShow') }))
    );
    if (!st.open) return;

    const counts = {};
    for (const r of v.rows) counts[r.type] = (counts[r.type] || 0) + 1;
    const chip = (key, label, n) => el('button', {
      class: `btn${st.filter === key ? ' on' : ''}`, type: 'button',
      onclick: () => { st.filter = key; st.page = 1; paint(); }
    }, projectIcon(key), `${label} (${n})`);

    const search = el('input', { class: 'iwsearch', type: 'search', placeholder: tr('wdSearchLinks'), value: st.q, autocomplete: 'off', spellcheck: 'false' });
    const body = el('div');
    search.addEventListener('input', () => { st.q = search.value; st.page = 1; list(); });
    root.append(
      search,
      el('div', { class: 'chips' }, chip('all', tr('wdAll'), v.rows.length), ...SITE_ORDER.filter((k) => counts[k]).map((k) => chip(k, SITE_NAMES[k], counts[k]))),
      body
    );

    function list() {
      const q = st.q.trim().toLowerCase();
      const rows = v.rows.filter((r) =>
        (st.filter === 'all' || r.type === st.filter) &&
        (!q || [r.name, r.native, r.title, r.lang, SITE_NAMES[r.type]].some((x) => x && x.toLowerCase().includes(q))));
      if (!rows.length) return body.replaceChildren(stateNode(tr('wdNoMatches')));

      const pages = Math.ceil(rows.length / IW_PAGE_SIZE);
      st.page = Math.min(st.page, pages);
      const start = (st.page - 1) * IW_PAGE_SIZE;
      const items = rows.slice(start, start + IW_PAGE_SIZE).map((r) => {
        const cur = r.type === 'wikipedia' && r.lang === S.lang;
        return el('li', {},
          el('a', { class: `iwitem${cur ? ' cur' : ''}`, href: r.url, target: '_blank', rel: 'noopener noreferrer' },
            projectIcon(r.type),
            el('span', { class: 'iwtext' },
              el('span', { class: 'iwname', dir: 'auto', text: r.name }),
              ...(r.native && r.native !== r.name ? [el('span', { class: 'iwnative', dir: 'auto', text: r.native })] : []),
              el('span', { class: 'iwtitle', dir: 'auto', text: `“${r.title}”` })),
            el('span', { class: 'badge', text: r.lang ? `${SITE_NAMES[r.type]} · ${r.lang.toUpperCase()}` : SITE_NAMES[r.type] })));
      });
      const nodes = [el('ul', { class: 'iwlist' }, ...items)];
      if (pages > 1) {
        const prev = el('button', { class: 'btn', type: 'button', text: tr('prev'), onclick: () => { st.page--; list(); } });
        const next = el('button', { class: 'btn', type: 'button', text: tr('next'), onclick: () => { st.page++; list(); } });
        prev.disabled = st.page === 1;
        next.disabled = st.page === pages;
        nodes.push(el('div', { class: 'pager' }, prev,
          el('span', { class: 'note', text: `${start + 1}–${Math.min(start + IW_PAGE_SIZE, rows.length)} / ${rows.length}` }), next));
      }
      body.replaceChildren(...nodes);
    }
    list();
  };
  paint();
  return root;
}

function renderEntity(v) {
  const label = pick(v.ent.labels) || v.id;
  const desc = pick(v.ent.descriptions);
  const entry = { project: 'wikidata', lang: S.lang, title: label, id: v.id, ...(desc ? { note: desc } : {}) };

  const saveBtn = el('button', { class: 'btn', type: 'button' });
  const paint = () => {
    const on = isSaved(entry);
    saveBtn.replaceChildren(bookmarkIcon(14, on), on ? tr('saved') : tr('save'));
    saveBtn.classList.toggle('on', on);
  };
  saveBtn.addEventListener('click', async () => {
    await toggleSave(entry);
    paint();
  });
  paint();

  // Title and description are in the interface language; the paragraph is in the language it was fetched in
  // (English when that Wikipedia has no article), so each part gets its own voice.
  const segments = [{ text: [label, desc].filter(Boolean).join('. '), lang: S.lang }];
  if (v.summary) segments.push({ text: v.summary.extract, lang: v.summary.lang });
  const readBtn = el('button', { class: 'btn', type: 'button' });
  const paintRead = () => {
    readBtn.textContent = speaking ? tr('stop') : tr('read');
    readBtn.classList.toggle('on', speaking);
  };
  readBtn.addEventListener('click', () => toggleSpeech(segments, paintRead));
  paintRead();

  const header = el('header', { class: 'hero' },
    el('div', { class: 'badges' },
      el('span', { class: 'badge', text: `${v.rows.length} interwiki` })),
    el('h1', { class: 'title', dir: 'auto', text: label }),
    el('p', { class: 'desc', dir: 'auto', text: desc || tr('wdNoDescription') }),
    el('div', { class: 'actions' }, saveBtn, extLink(pageUrl(entry), tr('openWikidata', { id: v.id }), 'btn'), readBtn));

  const intro = v.summary
    ? el('div', {},
      el('div', { class: 'introbar' },
        el('span', { class: 'badge', text: `Wikipedia · ${v.summary.lang.toUpperCase()}` }),
        extLink(v.summary.url, tr('wdReadFull'))),
      el('p', { class: 'extract', dir: 'auto', text: v.summary.extract }))
    : stateNode(tr('wdNoSummary'));

  setContent(header, card(tr('wdIntro'), intro), interwikiCard(v));
}

/* ------------------------------------------------------- Navigation */

function showLoading() {
  setContent(stateNode(tr('loading')));
  showTab('lookup');
}

// Thumbnails come from a second request; a failure there must not break the search itself.
async function addThumbnails(base, hits) {
  const files = hits.filter((h) => h.title.startsWith('File:'));
  if (!files.length) return;
  try {
    const d = await api(base, {
      action: 'query', titles: files.map((h) => h.title).join('|'), prop: 'imageinfo',
      iiprop: 'url|mediatype', iiurlwidth: 240
    });
    const info = new Map((d.query?.pages || []).map((p) => [p.title, p.imageinfo?.[0]]));
    for (const h of files) {
      const i = info.get(h.title);
      // Audio files only get a generic file-type icon from the API: the emoji placeholder looks better.
      h.thumb = i?.mediatype === 'AUDIO' ? '' : i?.thumburl || '';
      h.mediatype = i?.mediatype || '';
    }
  } catch { /* keep the icon placeholders */ }
}

async function searchProject(project, lang, q, page) {
  const cfg = PROJECTS[project];
  const offset = page * PAGE_SIZE;

  const attempt = async (l) => {
    const base = cfg.host(l);
    if (project === 'wikidata') {
      const d = await api(base, {
        action: 'wbsearchentities', search: q, language: l, uselang: l, type: 'item',
        limit: PAGE_SIZE, continue: offset
      });
      return {
        hasMore: d['search-continue'] != null,
        hits: (d.search || []).map((e) => ({ project, lang: l, reqLang: lang, id: e.id, title: e.label || e.id, note: e.description || '' }))
      };
    }
    const d = await api(base, {
      action: 'query', list: 'search', srsearch: q, srlimit: PAGE_SIZE, sroffset: offset, srprop: 'snippet',
      ...(cfg.ns ? { srnamespace: cfg.ns } : {})
    });
    const hits = (d.query?.search || []).map((h) => ({ project, lang: l, reqLang: lang, title: h.title, snippet: h.snippet }));
    if (project === 'commons') await addThumbnails(base, hits);
    return {
      hasMore: d.continue?.sroffset != null,
      pages: Math.ceil((d.query?.searchinfo?.totalhits || 0) / PAGE_SIZE),
      hits
    };
  };

  try {
    return await attempt(lang);
  } catch (err) {
    // Not every project has an edition in every language: fall back to English.
    if (err instanceof TypeError && cfg.perLang && lang !== 'en') return attempt('en');
    throw err;
  }
}

// wbsearchentities reports no total, so find the last page by probing offsets: double until a page is
// empty (in parallel), then bisect. `page` is a page known to exist after the current one.
async function probeWikidataPages(q, lang, page) {
  const exists = async (p) => {
    try {
      const d = await api(WD_HOST, {
        action: 'wbsearchentities', search: q, language: lang, uselang: lang, type: 'item',
        limit: 1, continue: p * PAGE_SIZE
      });
      return (d.search || []).length > 0;
    } catch {
      return false; // past the API's paging limit
    }
  };
  let lo = page;
  const steps = [];
  for (let p = Math.max(2, lo * 2); p <= 1024; p *= 2) steps.push(p);
  const found = await Promise.all(steps.map(exists));
  let hi = null;
  for (let i = 0; i < steps.length; i++) {
    if (found[i]) lo = steps[i];
    else { hi = steps[i]; break; }
  }
  if (hi === null) return lo + 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (await exists(mid)) lo = mid;
    else hi = mid;
  }
  return lo + 1;
}

async function runSearch(raw, { project = S.mode, lang = S.lang, page = 0, record = true, replace = false, pages = 0 } = {}) {
  const q = String(raw || '').replace(/[\s|]+/g, ' ').trim().slice(0, 150);
  if (!q) return;
  $('#q').value = q;
  if (record) addHistory(q, lang, project);

  const ctx = begin(replace || page > 0);
  showLoading();
  try {
    const r = await searchProject(project, lang, q, page);
    // Wikidata has no total: the last page is known once there is no next one, or from the probe below.
    const total = project === 'wikidata' ? (r.hasMore ? pages : page + 1) : r.pages;
    const view = { kind: 'results', project, lang, q, page, hits: r.hits, hasMore: r.hasMore, pages: total };
    if (!commit(ctx, view)) return;
    if (project === 'wikidata' && r.hasMore && !total) {
      probeWikidataPages(q, lang, page + 1).then((n) => {
        view.pages = n;
        if (current === view) $('.pagelabel')?.replaceChildren(pageLabel(view));
      });
    }
  } catch (err) {
    fail(ctx, err, () => runSearch(q, { project, lang, page, record: false, pages }));
  }
}

function goBack() {
  if (!stack.length) return;
  loadToken++;
  current = stack.pop();
  $('#back').disabled = stack.length === 0;
  showTab('lookup');
  renderView(current);
  $('#main').scrollTop = current.scroll || 0;
}

/* ------------------------------------------------- History and saved */

// One entry per keyword: searching the same word in another mode or language moves it to the top
// and updates where it was last searched, instead of adding a duplicate.
const historyKey = (text) => String(text).normalize('NFC').toLowerCase().replace(/s+/g, ' ').trim();

function dedupeHistory(list) {
  const seen = new Set();
  return list.filter((h) => {
    const k = historyKey(h.text);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

async function addHistory(text, lang, project) {
  if (!S.saveHistory) return;
  S.history = dedupeHistory([{ text, lang, project, ts: Date.now() }, ...S.history]).slice(0, 200);
  await chrome.storage.local.set({ history: S.history });
  renderHistory();
}

async function toggleSave(entry) {
  if (isSaved(entry)) S.saved = S.saved.filter((s) => keyOf(s) !== keyOf(entry));
  else S.saved = [{ ...entry, ts: Date.now() }, ...S.saved];
  await chrome.storage.local.set({ saved: S.saved });
  renderSaved();
}

function openSaved(s) {
  if (s.project === 'wikidata' && s.id) openEntity(s.id);
  else window.open(pageUrl(s), '_blank', 'noopener,noreferrer');
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

// "Today · Tuesday, 3 November 2026" for the last two days, the full date for older ones.
function dayTitle(ts) {
  const d = new Date(ts);
  const full = new Intl.DateTimeFormat(S.lang, { dateStyle: 'full' }).format(d);
  const diff = Math.round((startOfDay(new Date()) - startOfDay(d)) / 864e5);
  if (diff !== 0 && diff !== 1) return full;
  const rel = new Intl.RelativeTimeFormat(S.lang, { numeric: 'auto' }).format(-diff, 'day');
  return `${rel.charAt(0).toLocaleUpperCase(S.lang)}${rel.slice(1)} · ${full}`;
}

const fullTime = (ts) => new Intl.DateTimeFormat(S.lang, { dateStyle: 'medium', timeStyle: 'medium' }).format(ts);

function renderHistory() {
  const rows = [];
  let day = null;
  for (const h of S.history) {
    const key = startOfDay(new Date(h.ts));
    if (key !== day) {
      day = key;
      rows.push(el('li', { class: 'hgroup', text: dayTitle(h.ts) }));
    }
    rows.push(el('li', {}, el('button', {
      class: 'item', type: 'button',
      onclick: () => { setMode(h.project, false); runSearch(h.text, { project: h.project, lang: h.lang }); }
    },
    el('span', { class: 't', dir: 'auto' }, h.text, el('span', { class: 'badge', text: badgeText(h) })),
    el('time', { class: 's', datetime: new Date(h.ts).toISOString(), text: fullTime(h.ts) }))));
  }
  $('#historyList').replaceChildren(...rows);
  $('#historyEmpty').hidden = S.history.length > 0;
  $('#clearHistory').hidden = S.history.length === 0;
}

// A saved item looks like its type: Commons files keep their thumbnail, Wikidata items their Q number
// and description, language editions their language, and everything is grouped under its project.
function savedItem(s) {
  const title = el('span', { class: 't', dir: 'auto' }, s.title);
  if (s.id) title.append(el('span', { class: 'badge', text: s.id }));
  if (PROJECTS[s.project]?.perLang) title.append(el('span', { class: 'badge', text: s.lang.toUpperCase() }));
  const note = s.note ? [el('span', { class: 's', dir: 'auto', text: s.note })] : [];
  const body = s.project === 'commons' ? [thumbBox(s), el('span', { class: 'ibody' }, title, ...note)] : [title, ...note];
  return el('li', {},
    el('button', { class: s.project === 'commons' ? 'item withthumb' : 'item', type: 'button', onclick: () => openSaved(s) }, ...body),
    el('button', {
      class: 'del', type: 'button', title: tr('remove'), 'aria-label': tr('remove'), text: '×',
      onclick: async () => {
        await toggleSave(s);
        renderView(current);
      }
    }));
}

function renderSaved() {
  const rows = [];
  for (const [key, p] of Object.entries(PROJECTS)) {
    const items = S.saved.filter((s) => s.project === key);
    if (!items.length) continue;
    rows.push(el('li', { class: 'hgroup' }, projectIcon(key), `${p.name} (${items.length})`), ...items.map(savedItem));
  }
  $('#savedList').replaceChildren(...rows);
  $('#savedEmpty').hidden = S.saved.length > 0;
  $('#exportSaved').hidden = S.saved.length === 0;
}

function exportSaved() {
  const data = { format: 'wikipindai', version: 2, exported: new Date().toISOString(), saved: S.saved };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = el('a', { href: URL.createObjectURL(blob), download: `Wikipindai-saved-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function importSaved(file) {
  try {
    const data = JSON.parse(await file.text());
    const items = Array.isArray(data) ? data : data.saved;
    if (!Array.isArray(items)) throw new Error('bad format');
    let n = 0;
    for (const it of items) {
      if (!it || typeof it.title !== 'string' || it.title.length > 300) continue;
      const project = PROJECTS[it.project] ? it.project : LEGACY_PROJECT;
      const perLang = !!PROJECTS[project].perLang;
      if (perLang && !LANGUAGES[it.lang]) continue;
      if (project === 'wikidata' && !/^Q\d+$/.test(it.id || '')) continue;
      const entry = {
        project, lang: perLang ? it.lang : 'en', title: it.title,
        ...(project === 'wikidata' ? { id: it.id } : {}),
        ...(typeof it.note === 'string' && it.note ? { note: it.note.slice(0, 200) } : {}),
        // Only Wikimedia thumbnails: an imported file must not make the panel load arbitrary images.
        ...(/^https:\/\/(upload|commons)\.wikimedia\.org\//.test(it.thumb || '') ? { thumb: it.thumb } : {}),
        ...(/^[A-Z]{3,10}$/.test(it.mediatype || '') ? { mediatype: it.mediatype } : {})
      };
      if (isSaved(entry)) continue;
      S.saved.push({ ...entry, ts: Number(it.ts) || Date.now() });
      n++;
    }
    S.saved.sort((a, b) => b.ts - a.ts);
    await chrome.storage.local.set({ saved: S.saved });
    renderSaved();
    toast(tr('importDone', { n }));
  } catch {
    toast(tr('importError'));
  }
}

/* ---------------------------------------------------- UI plumbing */

function toast(msg) {
  const n = $('#toast');
  n.textContent = msg;
  n.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { n.hidden = true; }, 3500);
}

function showTab(name) {
  document.querySelectorAll('.tabs button').forEach((b) => {
    const on = b.dataset.tab === name;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
  });
  for (const v of ['lookup', 'history', 'saved', 'settings']) $(`#view-${v}`).hidden = v !== name;
  if (name === 'lookup' && staleLang) refreshForLang();
  if (name === 'settings') updateToolLinks();
  // On a narrow panel the tab row scrolls: keep the selected tab in view.
  document.querySelector('.tabs button.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function applyTheme() {
  if (S.theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = S.theme;
}

// Tools listed on https://meta.wikimedia.org/wiki/User:Affandy_Murad
const AUTHOR_URL = 'https://meta.wikimedia.org/wiki/User:Affandy_Murad';
const TOOLS = [
  { id: 'wikilokal', name: 'Wikilokal', url: 'https://wikilokal.netlify.app/', img: 'tools/wikilokal.png' },
  { id: 'timefids', name: 'Time FIDS', url: 'https://time-fids.web.app/', icon: '✈️' },
  { id: 'wikigaleri', name: 'WikiGaleri', url: 'https://wikigaleri.web.app/', icon: '🖼️' },
  { id: 'wikirekap', name: 'Wikirekap', url: 'https://affandymurad.github.io/wikirekap', icon: '📊' },
  { id: 'wikiperingkat', name: 'WikiPeringkat', url: 'https://affandymurad.github.io/wikiperingkat/', icon: '🔥' },
  { id: 'wikiabstrak', name: 'Wikiabstrak', url: 'https://wikiabstrak.web.app/', icon: '📝', takesQuery: true, takesLang: true },
  { id: 'medwikinoimage', name: 'MedWikiNoImage', url: 'https://affandymurad.github.io/medwikinoimage/', icon: '🩺' },
  { id: 'wikisuara', name: 'WikiSuara', url: 'https://wikisuara.web.app/', icon: '🎙️' },
  { id: 'wikitools', name: 'Kumpulan Alat Wiki', url: 'https://affandymurad.github.io/wiki/', icon: '🛠️', takesQuery: true }
];

// Tools that accept ?q= open with the current search text; with an empty search box they open without it.
// Wikiabstrak also takes ?lang=, so it opens in the interface language.
function toolUrl(tool) {
  const q = $('#q').value.trim();
  if (!tool.takesQuery && !tool.takesLang) return tool.url;
  const u = new URL(tool.url);
  if (tool.takesQuery && q) u.searchParams.set('q', q);
  if (tool.takesLang) u.searchParams.set('lang', S.lang);
  return u.href;
}

function updateToolLinks() {
  for (const tool of TOOLS) {
    const a = $(`#toolsList [data-tool="${tool.id}"]`);
    if (a) a.href = toolUrl(tool);
  }
}

function renderTools() {
  // toolsTitle is e.g. "Tools by {name}": the name becomes a link, wherever the language puts it.
  const MARK = '';
  const [before, after = ''] = tr('toolsTitle', { name: MARK }).split(MARK);
  $('#toolsTitle').replaceChildren(before, extLink(AUTHOR_URL, 'Affandy Murad'), after);
  $('#toolsList').replaceChildren(...TOOLS.map((tool) =>
    el('li', {}, el('a', { class: 'iwitem', href: tool.url, 'data-tool': tool.id, target: '_blank', rel: 'noopener noreferrer' },
      tool.img
        ? el('img', { class: 'picon tool-icon', src: tool.img, alt: '', loading: 'lazy' })
        : el('span', { class: 'tool-icon', 'aria-hidden': 'true', text: tool.icon }),
      el('span', { class: 'iwtext' },
        el('span', { class: 'iwname', text: tool.name }),
        el('span', { class: 'iwnative', dir: 'auto', text: tr('toolDesc_' + tool.id) }))))
  ));
  updateToolLinks();
}

function applyI18n() {
  document.documentElement.lang = S.lang;
  document.documentElement.dir = LANGUAGES[S.lang]?.dir || 'ltr';
  document.querySelectorAll('[data-i18n]').forEach((n) => { n.textContent = tr(n.dataset.i18n); });
  document.querySelectorAll('[data-i18n-title]').forEach((n) => {
    n.title = tr(n.dataset.i18nTitle);
    n.setAttribute('aria-label', n.title);
  });
  updateLangUI();
  updateModeUI();
  renderTools();
}

function buildModes() {
  $('#modes').replaceChildren(
    ...Object.entries(PROJECTS).map(([key, p]) =>
      el('button', { class: 'btn', type: 'button', role: 'tab', 'data-mode': key, onclick: () => setMode(key, true) }, projectIcon(key), p.name)
    )
  );
}

function updateModeUI() {
  document.querySelectorAll('#modes button').forEach((b) => {
    const on = b.dataset.mode === S.mode;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', String(on));
  });
  $('#q').placeholder = `${tr('search')} ${PROJECTS[S.mode].name}…`;
}

async function setMode(mode, rerun) {
  if (!PROJECTS[mode] || mode === S.mode) return;
  S.mode = mode;
  updateModeUI();
  await chrome.storage.local.set({ mode });
  if (!rerun) return;
  if ($('#q').value.trim()) runSearch($('#q').value);
  else if (!current) renderHome();
}

const flagSrc = (code) => `flags/${LANGUAGES[code]?.flag || 'us'}.svg`;

function checkIcon() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('class', 'tick');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', 'M5 12.5l4.5 4.5L19 7.5');
  p.setAttribute('fill', 'none');
  p.setAttribute('stroke', 'currentColor');
  p.setAttribute('stroke-width', '2');
  p.setAttribute('stroke-linecap', 'round');
  p.setAttribute('stroke-linejoin', 'round');
  svg.append(p);
  return svg;
}

function buildLangSelect() {
  const list = $('#langList');
  list.replaceChildren(
    ...Object.entries(LANGUAGES).map(([code, l]) =>
      el('li', { role: 'option', 'data-code': code },
        el('img', { class: 'flag', src: flagSrc(code), alt: '' }),
        el('span', { class: 'lname', dir: 'auto', text: l.name }),
        checkIcon())
    )
  );
  list.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-code]');
    if (li) setLang(li.dataset.code);
  });
  updateLangUI();
}

function updateLangUI() {
  $('#langFlag').src = flagSrc(S.lang);
  $('#langCode').textContent = S.lang.toUpperCase();
  $('#langBtn').title = LANGUAGES[S.lang]?.name || S.lang;
  document.querySelectorAll('#langList li').forEach((li) => {
    li.setAttribute('aria-selected', String(li.dataset.code === S.lang));
  });
}

function closeLangMenu() {
  $('#langMenu').hidden = true;
  $('#langBtn').setAttribute('aria-expanded', 'false');
}

function toggleLangMenu() {
  const menu = $('#langMenu');
  const open = menu.hidden;
  menu.hidden = !open;
  $('#langBtn').setAttribute('aria-expanded', String(open));
  if (open) $('#langList li[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
}

async function setLang(code) {
  closeLangMenu();
  if (!LANGUAGES[code] || code === S.lang) return;
  S.lang = code;
  await chrome.storage.local.set({ lang: code });
  applyI18n();
  renderHistory();
  renderSaved();

  // Results and Wikidata items depend on the language (the Wikipedia/Wiktionary/... edition, or the labels
  // and summary): fetch them again. Commons has one edition for every language, so it only needs redrawing.
  const refetch = current?.kind === 'entity' || (current?.kind === 'results' && current.project !== 'commons');
  if (!refetch) renderView(current);
  else if ($('#view-lookup').hidden) staleLang = true;
  else refreshForLang();
}

let staleLang = false;

function refreshForLang() {
  staleLang = false;
  if (current?.kind === 'entity') openEntity(current.id, { replace: true, iw: current.iw });
  // Another language is another edition with its own results, so start again from the first page.
  else if (current?.kind === 'results') runSearch(current.q, { project: current.project, record: false, replace: true });
}

function syncSettings() {
  $('#theme').value = S.theme;
  $('#saveHistory').checked = S.saveHistory;
}

function consume(p) {
  if (!p || p.t === lastPending) return;
  if (p.windowId != null && myWindowId != null && p.windowId !== myWindowId) return;
  lastPending = p.t;
  chrome.storage.session.remove('pending');
  if (countWords(p.q) > MAX_WORDS) {
    showTab('lookup');
    setContent(stateNode(tr('selectionTooLong')));
    return;
  }
  runSearch(p.q);
}

function bindEvents() {
  $('#searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    runSearch($('#q').value);
  });
  $('#q').addEventListener('input', (e) => {
    if (!e.target.value.trim() && current?.kind === 'results') resetToHome();
  });
  $('#back').addEventListener('click', goBack);

  document.querySelectorAll('.tabs button').forEach((b) =>
    b.addEventListener('click', () => showTab(b.dataset.tab))
  );

  $('#langBtn').addEventListener('click', toggleLangMenu);
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.langpick')) closeLangMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLangMenu();
  });

  $('#theme').addEventListener('change', async (e) => {
    S.theme = e.target.value;
    applyTheme();
    await chrome.storage.local.set({ theme: S.theme });
  });

  $('#saveHistory').addEventListener('change', async (e) => {
    S.saveHistory = e.target.checked;
    await chrome.storage.local.set({ saveHistory: S.saveHistory });
  });

  $('#clearHistory').addEventListener('click', async () => {
    S.history = [];
    await chrome.storage.local.set({ history: [] });
    renderHistory();
  });

  $('#exportSaved').addEventListener('click', exportSaved);
  $('#importSaved').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) await importSaved(f);
  });

  // Right-click lookups and click-mode lookups arrive through session storage.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'session' && changes.pending?.newValue) consume(changes.pending.newValue);
  });
}

async function init() {
  S = { ...DEFAULTS, ...(await chrome.storage.local.get(DEFAULTS)) };
  if (!LANGUAGES[S.lang]) S.lang = DEFAULT_LANG;
  if (!PROJECTS[S.mode]) S.mode = DEFAULT_MODE;
  // Entries saved before the project modes existed are Wikipedia articles.
  S.saved = S.saved.map((s) => ({ project: LEGACY_PROJECT, ...s }));
  const before = S.history.length;
  S.history = dedupeHistory(S.history.map((h) => ({ project: LEGACY_PROJECT, ...h })));
  if (S.history.length !== before) chrome.storage.local.set({ history: S.history });
  try {
    myWindowId = (await chrome.windows.getCurrent()).id;
  } catch { /* ignore */ }

  $('#savedSample').textContent = JSON.stringify({
    saved: [
      { project: 'wikidata', id: 'Q42', title: 'Douglas Adams' },
      { project: 'wikipedia', lang: 'id', title: 'Borobudur' }
    ]
  }, null, 1) + '\n// project: ' + Object.keys(PROJECTS).join(' | ');
  buildLangSelect();
  buildModes();
  applyTheme();
  applyI18n();
  bindEvents();
  syncSettings();
  renderHome();
  renderHistory();
  renderSaved();

  const { pending } = await chrome.storage.session.get('pending');
  if (pending && Date.now() - pending.t < 20000) consume(pending);
}

init();
