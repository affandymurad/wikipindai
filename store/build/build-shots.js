// Builds the five store screenshots (1280x800) in English and Indonesian from the real side panel.
// Needs network access (the panel fetches live results from Wikimedia) and Chrome or Edge installed.
//   node build-shots.js            all scenes, both languages
//   node build-shots.js detail id  one scene, one language
const fs = require('fs');
const https = require('https');
const path = require('path');
const { spawnSync } = require('child_process');
const { startServer, shot, BUILD_ROOT, EXT_ROOT } = require('./capture');

const OUT = path.join(EXT_ROOT, 'store', 'screenshots');
const TMP = path.join(BUILD_ROOT, 'tmp');

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Wikipindai-store-build/1.0 (https://affandymurad.github.io/wikipindai/)' } }, (res) => {
      let s = '';
      res.on('data', (d) => { s += d; });
      res.on('end', () => { try { resolve(JSON.parse(s)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

// Real items for the "saved" scene, so the screenshot shows genuine entries and thumbnails.
async function savedItems(lang) {
  const wd = await getJson(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(TERM(lang))}&language=${lang}&uselang=${lang}&type=item&limit=1&format=json&origin=*`);
  const e = wd.search[0];
  const list = await getJson('https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=Borobudur+temple&srnamespace=6&srlimit=3&format=json&formatversion=2&origin=*');
  const titles = list.query.search.map((s) => s.title);
  const info = await getJson('https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url|mediatype&iiurlwidth=240&format=json&formatversion=2&origin=*&titles=' + encodeURIComponent(titles.join('|')));
  const files = info.query.pages.filter((p) => p.imageinfo && p.imageinfo[0].thumburl).slice(0, 2);
  const summ = await getJson(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/Borobudur`);
  const now = Date.now();
  // cut at a word boundary and mark it, as the panel's own saved note would be read
  const cut = (summ.extract || '').slice(0, 130);
  const note = cut.length < (summ.extract || '').length ? cut.replace(/\s+\S*$/, '') + '…' : cut;
  return [
    { project: 'wikidata', lang, id: e.id, title: e.label, note: e.description || '', ts: now },
    { project: 'wikipedia', lang, title: summ.title || 'Borobudur', note, ts: now - 1 },
    ...files.map((f, i) => ({
      project: 'commons', lang: 'en', title: f.title, mediatype: f.imageinfo[0].mediatype,
      thumb: f.imageinfo[0].thumburl, note: 'Borobudur', ts: now - 2 - i
    })),
    { project: 'wikivoyage', lang: 'en', title: 'Yogyakarta', ts: now - 5 },
    { project: 'wiktionary', lang, title: lang === 'id' ? 'candi' : 'temple', ts: now - 6 }
  ];
};

// The temple (Q42798), not the district that shares its name.
const TERM = (l) => (l === 'id' ? 'Candi Borobudur' : 'Borobudur Temple');
const SCENES = {
  detail: (l) => ({ seed: { lang: l, mode: 'wikidata' }, run: [['search', TERM(l)], ['pickq', 'Q42798']] }),
  interwiki: (l) => ({ seed: { lang: l, mode: 'wikidata' }, run: [['search', TERM(l)], ['pickq', 'Q42798'], ['iw'], ['scroll', 440]] }),
  commons: (l) => ({ seed: { lang: l, mode: 'commons' }, run: [['search', 'Borobudur sunrise'], ['waitimg', 6]] }),
  saved: async (l) => ({ seed: { lang: l, mode: 'wikidata', saved: await savedItems(l) }, run: [['tab', 'saved'], ['wait', 1500], ['scroll', 500]] }),
  languages: () => ({ seed: { lang: 'ja', theme: 'dark', mode: 'wikidata' }, run: [['search', '富士山'], ['open', 0]] })
};
const ORDER = ['detail', 'interwiki', 'commons', 'saved', 'languages'];

const ps = (...args) => {
  const r = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(BUILD_ROOT, 'img.ps1'), ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('img.ps1 failed: ' + r.stderr + r.stdout);
};

(async () => {
  const onlyScene = process.argv[2];
  const onlyLang = process.argv[3];
  fs.mkdirSync(TMP, { recursive: true });
  const server = await startServer();
  try {
    for (const lang of ['en', 'id']) {
      if (onlyLang && onlyLang !== lang) continue;
      fs.mkdirSync(path.join(OUT, lang), { recursive: true });
      for (const [i, scene] of ORDER.entries()) {
        if (onlyScene && onlyScene !== scene) continue;
        const cfg = await SCENES[scene](lang);
        const panel = 'http://localhost:5188/sidepanel.html?seed=' + encodeURIComponent(JSON.stringify(cfg.seed)) + '&run=' + encodeURIComponent(JSON.stringify(cfg.run));
        const url = 'http://localhost:5188/build/shot.html?lang=' + lang + '&scene=' + scene + '&panel=' + encodeURIComponent(panel);
        const raw = path.join(TMP, `${lang}-${scene}.png`);
        const out = path.join(OUT, lang, `${String(i + 1).padStart(2, '0')}-${scene}.png`);
        const r = await shot(url, raw, { width: 1280, height: 800, budget: 45000 });
        ps('-Op', 'flatten', '-In', raw, '-Out', out);
        console.log(lang, scene, r.w + 'x' + r.h);
      }
    }
  } finally {
    server.close();
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
