import { LANGUAGES, DEFAULT_LANG, t } from './languages.js';

const MENU_ID = 'lookup-selection';

async function getLang() {
  const { lang } = await chrome.storage.local.get('lang');
  return LANGUAGES[lang] ? lang : DEFAULT_LANG;
}

async function buildMenu() {
  const lang = await getLang();
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create(
    { id: MENU_ID, title: t(lang, 'menuLookup'), contexts: ['selection'] },
    () => void chrome.runtime.lastError
  );
}

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    const ui = (chrome.i18n.getUILanguage() || '').toLowerCase();
    const code = ui.split('-')[0];
    await chrome.storage.local.set({ lang: LANGUAGES[code] ? code : DEFAULT_LANG });
  }
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  await buildMenu();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  buildMenu();
});

// Keep the right-click menu title in sync with the selected language.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.lang) buildMenu();
});

async function lookup(text, tabId, windowId) {
  const q = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 150);
  if (!q) return;
  // Open the panel first, while the user gesture is still valid.
  const opening = chrome.sidePanel
    .open(tabId != null && tabId >= 0 ? { tabId } : { windowId })
    .catch(() => {});
  await chrome.storage.session.set({ pending: { q, t: Date.now(), windowId } });
  await opening;
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_ID) lookup(info.selectionText, tab?.id, tab?.windowId);
});
