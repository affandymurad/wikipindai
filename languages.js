// Language registry.
//
// The key is the Wikimedia language code. It drives BOTH the Wikipedia edition
// (https://<code>.wikipedia.org) and the interface language, so the UI and the
// Wikimedia language are one and the same thing.
//
// To add a language (e.g. Javanese "jv", Sundanese "su"):
//   1. Add an entry below with `name`, `flag` (file name in flags/, without .svg),
//      `dir` and `ui`
//      (any strings you translate).
//   2. Put the translated strings in translations.js (UI_STRINGS[code]); strings
//      missing there automatically fall back to English.
// Nothing else needs to change; the language selector is built from this object.

import { UI_STRINGS, UI_MORE, UI_MODES, UI_READ, UI_TEXT, UI_RESULTS, UI_SAVED, UI_NOTE } from './translations.js';

export const DEFAULT_LANG = 'en';

export const LANGUAGES = {
  en: {
    name: 'English',
    flag: 'us',
    dir: 'ltr',
    ui: {
      menuLookup: 'Look up "%s" on Wikipindai',
      searchPlaceholder: 'Search Wikipedia…',
      search: 'Search',
      back: 'Back',
      language: 'Language',
      langMenuTitle: 'Interface & data language',
      tabLookup: 'Wikipedia',
      tabHistory: 'History',
      tabSaved: 'Saved',
      tabSettings: 'Settings',
      homeHint: 'Select text on any page, right-click and choose “Look up on Wikipindai”, or type a search above.',
      loading: 'Loading…',
      resultsFor: 'Results for “{q}”',
      ambiguous: '“{q}” has several meanings. Pick an article:',
      disambPage: 'Disambiguation page',
      noResults: 'No articles found for “{q}”.',
      searchOnWikipedia: 'Search on Wikipedia',
      errorNetwork: 'Could not reach Wikipedia. Check your connection and try again.',
      errorGeneric: 'Something went wrong: {msg}',
      notFound: 'This article does not exist.',
      retry: 'Try again',
      save: 'Save',
      saved: 'Saved',
      openOriginal: 'Open on Wikipedia',
      source: 'Source: Wikipedia ({name})',
      license: 'CC BY-SA 4.0',
      pageHistory: 'Authors & history',
      historyEmpty: 'No searches yet.',
      clearHistory: 'Clear history',
      savedEmpty: 'No saved articles yet. Open an article and press Save.',
      remove: 'Remove',
      export: 'Export',
      import: 'Import',
      importDone: '{n} article(s) imported.',
      importError: 'Could not read that file.',
      theme: 'Theme',
      themeSystem: 'System',
      themeLight: 'Light',
      themeDark: 'Dark',
      saveHistory: 'Save search history',
    }
  },

  id: {
    name: 'Bahasa Indonesia',
    flag: 'id',
    dir: 'ltr',
    ui: {
      menuLookup: 'Cari "%s" di Wikipindai',
      searchPlaceholder: 'Cari di Wikipedia…',
      search: 'Cari',
      back: 'Kembali',
      language: 'Bahasa',
      langMenuTitle: 'Bahasa antarmuka & data',
      tabLookup: 'Wikipedia',
      tabHistory: 'Riwayat',
      tabSaved: 'Tersimpan',
      tabSettings: 'Pengaturan',
      homeHint: 'Blok teks di halaman mana pun, klik kanan lalu pilih “Cari di Wikipindai”, atau ketik pencarian di atas.',
      loading: 'Memuat…',
      resultsFor: 'Hasil untuk “{q}”',
      ambiguous: '“{q}” memiliki beberapa arti. Pilih artikel:',
      disambPage: 'Halaman disambiguasi',
      noResults: 'Tidak ada artikel untuk “{q}”.',
      searchOnWikipedia: 'Cari di Wikipedia',
      errorNetwork: 'Tidak dapat menghubungi Wikipedia. Periksa koneksi Anda lalu coba lagi.',
      errorGeneric: 'Terjadi kesalahan: {msg}',
      notFound: 'Artikel ini tidak ada.',
      retry: 'Coba lagi',
      save: 'Simpan',
      saved: 'Tersimpan',
      openOriginal: 'Buka di Wikipedia',
      source: 'Sumber: Wikipedia ({name})',
      license: 'CC BY-SA 4.0',
      pageHistory: 'Penulis & riwayat',
      historyEmpty: 'Belum ada pencarian.',
      clearHistory: 'Hapus riwayat',
      savedEmpty: 'Belum ada artikel tersimpan. Buka artikel lalu tekan Simpan.',
      remove: 'Hapus',
      export: 'Ekspor',
      import: 'Impor',
      importDone: '{n} artikel diimpor.',
      importError: 'Berkas tersebut tidak dapat dibaca.',
      theme: 'Tema',
      themeSystem: 'Sistem',
      themeLight: 'Terang',
      themeDark: 'Gelap',
      saveHistory: 'Simpan riwayat pencarian',
    }
  },

  ms: {
    name: 'Bahasa Melayu',
    flag: 'my',
    dir: 'ltr',
    ui: {} // filled from translations.js
  },

  ko: {
    name: '한국어',
    flag: 'kr',
    dir: 'ltr',
    ui: {} // filled from translations.js
  },

  es: {
    name: 'Español',
    flag: 'es',
    dir: 'ltr',
    ui: {} // filled from translations.js
  },

  fr: {
    name: 'Français',
    flag: 'fr',
    dir: 'ltr',
    ui: {} // filled from translations.js
  },

  de: {
    name: 'Deutsch',
    flag: 'de',
    dir: 'ltr',
    ui: {} // filled from translations.js
  },

  ja: {
    name: '日本語',
    flag: 'jp',
    dir: 'ltr',
    ui: {} // filled from translations.js
  },

  zh: {
    name: '中文',
    flag: 'cn',
    dir: 'ltr',
    ui: {} // filled from translations.js
  },

  ar: {
    name: 'العربية',
    flag: 'sa',
    dir: 'rtl',
    ui: {} // filled from translations.js
  },

  nl: {
    name: 'Nederlands',
    flag: 'nl',
    dir: 'ltr',
    ui: {} // filled from translations.js
  },

  ru: {
    name: 'Русский',
    flag: 'ru',
    dir: 'ltr',
    ui: {} // filled from translations.js
  },

  th: {
    name: 'ไทย',
    flag: 'th',
    dir: 'ltr',
    ui: {} // filled from translations.js
  },

  ta: {
    name: 'தமிழ்',
    flag: 'in',
    dir: 'ltr',
    ui: {} // filled from translations.js
  },

  he: {
    name: 'עברית',
    flag: 'il',
    dir: 'rtl',
    ui: {} // filled from translations.js
  }
};

for (const [code, ui] of Object.entries(UI_STRINGS)) {
  if (LANGUAGES[code]) LANGUAGES[code].ui = ui;
}

for (const [code, more] of Object.entries({ ...UI_MORE })) {
  Object.assign(more, UI_MODES[code], UI_READ[code], UI_TEXT[code], UI_RESULTS[code], UI_SAVED[code], UI_NOTE[code]);
  if (LANGUAGES[code]) Object.assign(LANGUAGES[code].ui, more);
}

export function t(lang, key, vars = {}) {
  const s = LANGUAGES[lang]?.ui?.[key] ?? LANGUAGES[DEFAULT_LANG].ui[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
}

export function wikiHost(lang) {
  return `https://${lang}.wikipedia.org`;
}
