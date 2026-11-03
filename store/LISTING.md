# Isian Chrome Web Store untuk Wikipindai / Chrome Web Store listing

Bahan siap tempel untuk Developer Dashboard, dalam Indonesia dan Inggris. Folder `store/` tidak ikut masuk
ke paket ZIP. Semua gambar dibuat ulang dengan `store/build/` (lihat bagian paling bawah).

## 1. Kategori / Category

- **Utama / Primary:** `Productivity` → subkategori **`Education`** (rujukan, pembelajaran, dan membaca).
- **Alternatif / Alternative:** `Productivity` → **`Tools`**.
- Pilihan kategori di dashboard bisa berubah dari waktu ke waktu; pilih yang paling dekat dengan
  "referensi / edukasi / pencarian".

## 2. Bahasa listing / Listing languages

Tambahkan dua bahasa di tab Store listing: **Indonesian (id)** dan **English**. Antarmuka ekstensi sendiri
mendukung 15 bahasa. Pasang screenshot dan promo tile sesuai bahasa listing (folder `en/` dan `id/`).

## 3. Nama dan ringkasan / Name and summary

**Nama / Name:** Wikipindai

**Ringkasan / Summary** (maks. 132 karakter; sudah ada di `_locales`, terisi otomatis dari manifest):

- id (120): Cari teks terpilih di proyek Wikimedia lewat panel samping. Tanpa AI, pelacakan, atau server. Dibuat oleh Affandy Murad.
- en (114): Look up selected text on Wikimedia projects in a side panel. No AI, tracking or own server. Made by Affandy Murad.

## 4. Deskripsi panjang / Detailed description

Revisi setelah penolakan "Keyword Spam" (Yellow Argon): daftar tujuh nama proyek dan daftar nama bahasa dihapus,
nama proyek disebut seperlunya saja dan tidak diulang-ulang. Jangan menambahkan kembali daftar nama proyek,
nama bahasa, atau kata kunci berulang di deskripsi, judul, ringkasan, screenshot, maupun promo tile.

### Bahasa Indonesia

Wikipindai membantu Anda mencari tahu sesuatu tanpa meninggalkan halaman yang sedang dibaca. Blok sebuah kata
atau frasa pendek, klik kanan, dan jawabannya terbuka di panel samping Chrome. Anda juga bisa mengklik ikon
ekstensi lalu mengetik pencarian.

Cari di Wikipedia, Wikidata, dan proyek Wikimedia lain yang biasa Anda pakai, lalu berpindah antarproyek
dengan satu klik: kata yang sama langsung dicari ulang, dan kolom kosong menjelaskan fungsi tiap proyek.

YANG ANDA DAPATKAN
• Tampilan detail dengan deskripsi singkat, paragraf pembuka dalam bahasa Anda, dan tombol baca yang memakai
  suara di perangkat.
• Direktori interwiki: lihat di bahasa dan proyek mana saja sebuah topik ada, lengkap dengan filter,
  pencarian, dan halaman.
• Hasil gambar dengan thumbnail, serta hasil berpaginasi dengan jumlah halaman.
• Riwayat dikelompokkan per tanggal dan jam; item tersimpan dikelompokkan per proyek, dengan ekspor dan impor
  JSON.
• 15 bahasa antarmuka dengan tema terang dan gelap. Mengganti bahasa memuat ulang hasil dari edisi bahasa itu.

PRIVASI
Tanpa AI, tanpa pelacakan, tanpa server sendiri. Pencarian hanya dikirim ke situs yang Anda cari, riwayat dan item
tersimpan tetap di perangkat Anda, dan ekstensi tidak meminta akses ke situs web mana pun.
Kebijakan privasi: https://affandymurad.github.io/wikipindai/privacy.html

Konten memakai lisensi dari proyek asalnya.

Wikipindai adalah proyek independen dan tidak berafiliasi dengan, didukung, atau disponsori oleh Wikimedia
Foundation. Wikipedia dan nama proyek Wikimedia lainnya adalah merek dagang Wikimedia Foundation.

Dibuat oleh Affandy Murad. Kode sumber berlisensi MIT.
Halaman proyek: https://affandymurad.github.io/wikipindai/

### English

Wikipindai helps you look things up without leaving the page you are reading. Select a word or a short
phrase, right-click, and the answer opens in Chrome's side panel. You can also click the toolbar icon and
type a search.

Search Wikipedia, Wikidata and other Wikimedia projects you already use, and switch between them with one
click: the same word is searched again, and an empty box explains what each project is for.

WHAT YOU GET
• A detail view with a short description, the opening paragraph in your language, and a read-aloud button
  that uses voices on your device.
• An interwiki directory showing every language and project a topic exists in, with filters, search and
  pages.
• Image results with thumbnails, and paginated results with a page count.
• History grouped by date and time; saved items grouped by project, with JSON export and import.
• 15 interface languages with light and dark themes. Changing language reloads the results from that
  language's edition.

PRIVACY
No AI, no tracking, no server of its own. Searches go only to the sites you search, history and saved items
stay on your device, and the extension asks for no access to any website.
Privacy policy: https://affandymurad.github.io/wikipindai/privacy.html

Content keeps the licenses of the projects it comes from.

Wikipindai is an independent project and is not affiliated with, endorsed by, or sponsored by the Wikimedia
Foundation. Wikipedia and the other Wikimedia project names are trademarks of the Wikimedia Foundation.

Made by Affandy Murad. Source code is MIT licensed.
Project page: https://affandymurad.github.io/wikipindai/

## 5. Aset grafis / Graphics

| Aset / Asset | Ukuran / Size | Berkas / File |
| --- | --- | --- |
| Ikon toko / Store icon | 128×128 (artwork 96 px + margin transparan 16 px) | `store/assets/store-icon-128.png` (sama dengan `icons/icon128.png`) |
| Screenshot (5 per bahasa) | 1280×800, PNG 24-bit | `store/screenshots/id/01…05-*.png` dan `store/screenshots/en/01…05-*.png` |
| Small promo tile | 440×280 | `store/assets/promo-tile-440x280-id.png`, `…-en.png` |
| Marquee promo tile (opsional) | 1400×560 | `store/assets/marquee-1400x560-id.png`, `…-en.png` |

Urutan screenshot / order: 1 detail Wikidata, 2 direktori interwiki, 3 hasil Commons dengan thumbnail,
4 item tersimpan, 5 15 bahasa dalam mode gelap.

## 6. Tab "Privacy"

**Single purpose**

- id: Mencari teks (yang dipilih di halaman atau diketik di panel) di proyek Wikimedia, lalu menampilkan hasilnya di panel samping Chrome.
- en: Look up text (selected on a page or typed in the panel) on Wikimedia projects and show the results in Chrome's side panel.

**Permission justification**

| Izin / Permission | Alasan / Justification |
| --- | --- |
| `sidePanel` | Menampilkan hasil pencarian di panel samping Chrome. / Shows search results in Chrome's side panel. |
| `contextMenus` | Menambahkan item "Cari … di Wikipindai" saat teks dipilih. / Adds the "Look up … on Wikipindai" item when text is selected. |
| `storage` | Menyimpan bahasa, tema, mode, riwayat, dan item tersimpan di perangkat; meneruskan teks terpilih dari menu klik kanan ke panel. / Keeps language, theme, mode, history and saved items on the device; hands the selected text from the context menu to the panel. |
| Host permissions | Tidak ada. Permintaan ke Wikimedia memakai CORS biasa. / None. Requests to Wikimedia use ordinary CORS. |

**Remote code:** Tidak / No. Seluruh kode ada di dalam paket.

**Data usage:** centang kategori yang berlaku menurut definisi di dashboard. Saran: **Website content**
(teks yang dipilih pengguna dikirim ke Wikimedia untuk dicari). Tidak mengumpulkan identitas pribadi,
kesehatan, finansial, autentikasi, komunikasi pribadi, lokasi, riwayat web, atau aktivitas pengguna
(riwayat pencarian hanya disimpan lokal). Centang tiga pernyataan kepatuhan: tidak dijual ke pihak ketiga,
tidak dipakai di luar tujuan tunggal, tidak dipakai untuk kelayakan kredit.

**Privacy policy URL:** `https://affandymurad.github.io/wikipindai/privacy.html`
(sumber: `affandymurad.github.io/wikipindai/privacy.html`; salinan Markdown: `PRIVACY.md`)

**Homepage URL (opsional):** `https://affandymurad.github.io/wikipindai/`

## 7. Membuat ulang gambar / Rebuilding the images

Perlu Node.js, Chrome (atau Edge) dan koneksi internet (panel mengambil data langsung dari Wikimedia).

```bash
cd store/build
node build-icons.js    # ikon ekstensi 16/32/48/128 dan ikon toko dari icon.svg
node build-shots.js    # 5 screenshot x 2 bahasa (atau: node build-shots.js saved id)
node build-tiles.js    # promo tile 440x280 dan marquee 1400x560, 2 bahasa
```
