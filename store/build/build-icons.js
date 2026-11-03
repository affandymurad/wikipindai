// Renders icon.svg to the extension icons (16/32/48/128) and the store icon.
// 128px keeps the 16px transparent margin the Web Store asks for; the small sizes use the artwork only,
// so the glyph is not tiny in the toolbar.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { startServer, shot, BUILD_ROOT, EXT_ROOT } = require('./capture');

const ps = (...args) => {
  const r = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(BUILD_ROOT, 'img.ps1'), ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('img.ps1 failed: ' + r.stderr + r.stdout);
};

(async () => {
  const svg = fs.readFileSync(path.join(BUILD_ROOT, 'icon.svg'), 'utf8');
  // art-only crop (toolbar sizes) and the 128px store layout (artwork fills 96px of 128, 16px transparent margin)
  fs.writeFileSync(path.join(BUILD_ROOT, 'icon-art.svg'), svg.replace('viewBox="0 0 1254 1254"', 'viewBox="134 120 1060 1060"'));
  fs.writeFileSync(path.join(BUILD_ROOT, 'icon-store.svg'), svg.replace('viewBox="0 0 1254 1254"', 'viewBox="-43 -57 1413 1413"'));
  for (const name of ['icon-store', 'icon-art']) {
    fs.writeFileSync(path.join(BUILD_ROOT, name + '-render.html'),
      '<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent;overflow:hidden}img{display:block;width:1024px;height:1024px}</style>' +
      '<img src="/build/' + name + '.svg">');
  }

  const server = await startServer();
  const tmp = path.join(BUILD_ROOT, 'tmp');
  fs.mkdirSync(tmp, { recursive: true });
  for (const name of ['icon-store', 'icon-art']) {
    await shot('http://localhost:5188/build/' + name + '-render.html', path.join(tmp, name + '-1024.png'), { width: 1024, height: 1024, budget: 3000, transparent: true });
  }
  server.close();

  fs.mkdirSync(path.join(BUILD_ROOT, 'old-icons'), { recursive: true });
  for (const s of [16, 32, 48, 128]) {
    const cur = path.join(EXT_ROOT, 'icons', 'icon' + s + '.png');
    const bak = path.join(BUILD_ROOT, 'old-icons', 'icon' + s + '.png');
    if (fs.existsSync(cur) && !fs.existsSync(bak)) fs.copyFileSync(cur, bak);
  }
  ps('-Op', 'resize', '-In', path.join(tmp, 'icon-store-1024.png'), '-Out', path.join(EXT_ROOT, 'icons', 'icon128.png'), '-W', '128', '-H', '128');
  for (const s of [16, 32, 48]) {
    ps('-Op', 'resize', '-In', path.join(tmp, 'icon-art-1024.png'), '-Out', path.join(EXT_ROOT, 'icons', 'icon' + s + '.png'), '-W', String(s), '-H', String(s));
  }
  fs.mkdirSync(path.join(EXT_ROOT, 'store', 'assets'), { recursive: true });
  fs.copyFileSync(path.join(EXT_ROOT, 'icons', 'icon128.png'), path.join(EXT_ROOT, 'store', 'assets', 'store-icon-128.png'));
  // larger art-only sizes for the promo site (favicon, logo, social image)
  ps('-Op', 'resize', '-In', path.join(tmp, 'icon-art-1024.png'), '-Out', path.join(EXT_ROOT, 'store', 'assets', 'icon-512-art.png'), '-W', '512', '-H', '512');
  console.log('icons done');
})().catch((e) => { console.error(e.message); process.exit(1); });
