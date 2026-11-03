// Copies the finished store assets into the promo site folder (affandymurad.github.io/wikipindai):
// JPEG versions of the screenshots, icons, social image and the extension ZIP.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const EXT = path.resolve(__dirname, '..', '..');
// usage: node build-site-assets.js <path to the promo site folder>
const SITE = process.argv[2];
if (!SITE) { console.error('usage: node build-site-assets.js <promo-site-folder>'); process.exit(1); }
const ps = (...args) => {
  const r = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'img.ps1'), ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('img.ps1 failed: ' + r.stderr + r.stdout);
};

fs.mkdirSync(path.join(SITE, 'images', 'shots'), { recursive: true });
fs.mkdirSync(path.join(SITE, 'downloads'), { recursive: true });

for (const lang of ['en', 'id']) {
  for (const f of fs.readdirSync(path.join(EXT, 'store', 'screenshots', lang))) {
    ps('-Op', 'jpeg', '-In', path.join(EXT, 'store', 'screenshots', lang, f), '-Out', path.join(SITE, 'images', 'shots', `${lang}-${f.replace('.png', '.jpg')}`), '-Q', '84');
  }
}
// social image: the wide marquee
ps('-Op', 'jpeg', '-In', path.join(EXT, 'store', 'assets', 'marquee-1400x560-en.png'), '-Out', path.join(SITE, 'images', 'og.jpg'), '-Q', '86', '-W', '1200');

const art = path.join(EXT, 'store', 'assets', 'icon-512-art.png');
fs.copyFileSync(art, path.join(SITE, 'icon-512.png'));
ps('-Op', 'resize', '-In', art, '-Out', path.join(SITE, 'icon-192.png'), '-W', '192', '-H', '192');
ps('-Op', 'resize', '-In', art, '-Out', path.join(SITE, 'favicon-32.png'), '-W', '32', '-H', '32');

const version = JSON.parse(fs.readFileSync(path.join(EXT, 'manifest.json'), 'utf8')).version;
fs.copyFileSync(path.join(EXT, 'dist', `wikipindai-${version}.zip`), path.join(SITE, 'downloads', `wikipindai-${version}.zip`));
console.log('site assets done ->', SITE);
