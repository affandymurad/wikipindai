# Isian tab "Privacy" di Chrome Web Store / "Privacy" tab fields

Setiap kolom di bawah ini maksimal 1.000 karakter. Kolom di dashboard hanya satu bahasa, jadi tempel versi
**English** (dibaca tim review). Versi Indonesia disediakan sebagai rujukan.

## Single purpose description

**EN**
Look up text (selected on a page or typed in the panel) on Wikimedia projects and show the results in Chrome's side panel.

**ID**
Mencari teks (yang dipilih di halaman atau diketik di panel) di proyek Wikimedia, lalu menampilkan hasilnya di panel samping Chrome.

## sidePanel justification

**EN**
The extension's whole interface is Chrome's side panel. Results for the searched or selected text are shown there, so the user can read them next to the page they are on. The panel opens from the toolbar icon (sidePanel.setPanelBehavior) and from the right-click menu (sidePanel.open).

**ID**
Seluruh antarmuka ekstensi adalah panel samping Chrome. Hasil pencarian atau teks yang dipilih ditampilkan di sana, sehingga pengguna bisa membacanya di samping halaman yang sedang dibuka. Panel dibuka dari ikon toolbar (sidePanel.setPanelBehavior) dan dari menu klik kanan (sidePanel.open).

## contextMenus justification

**EN**
Adds one right-click item, "Look up “…” on Wikipindai", that appears only when the user has selected text (contexts: selection). Clicking it sends the selected text to the side panel to be searched. The item's title follows the interface language chosen in the extension. No other menu items are added.

**ID**
Menambahkan satu item klik kanan, "Cari “…” di Wikipindai", yang hanya muncul saat pengguna memilih teks (contexts: selection). Mengkliknya mengirim teks terpilih ke panel samping untuk dicari. Judul item mengikuti bahasa antarmuka yang dipilih di ekstensi. Tidak ada item menu lain yang ditambahkan.

## storage justification

**EN**
chrome.storage.local keeps the user's settings (interface language, theme, search mode), search history (up to 200 terms; can be turned off or cleared in Settings) and saved items, all on the device. chrome.storage.session passes the text selected through the right-click menu from the background service worker to the side panel for a few seconds. Nothing in storage is sent to any server.

**ID**
chrome.storage.local menyimpan pengaturan pengguna (bahasa antarmuka, tema, mode pencarian), riwayat pencarian (maksimal 200 kata; bisa dimatikan atau dihapus di Pengaturan), dan item tersimpan, semuanya di perangkat. chrome.storage.session meneruskan teks yang dipilih lewat menu klik kanan dari service worker latar belakang ke panel samping selama beberapa detik. Tidak ada isi penyimpanan yang dikirim ke server mana pun.

## Are you using remote code?

Pilih / Select: **No, I am not using remote code.**
(Semua JavaScript ada di dalam paket; tidak ada `<script>` eksternal, `eval()`, atau modul dari luar paket. Wikipindai hanya mengambil data JSON dari API Wikimedia, bukan kode.)

## Data usage

What user data do you plan to collect…?

- Centang / Check: **Website content**
  (teks yang dipilih pengguna di halaman web atau diketik di panel dikirim ke situs Wikimedia untuk dicari)
- Jangan dicentang / Leave unchecked: Personally identifiable information, Health information, Financial and
  payment information, Authentication information, Personal communications, Location, Web history, User activity.
  (Riwayat pencarian hanya disimpan lokal di perangkat dan tidak dikirim; Wikipindai tidak memakai lokasi.)

I certify that the following disclosures are true: **centang ketiganya / check all three**
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

## Privacy policy URL

`https://affandymurad.github.io/wikipindai/privacy.html`
