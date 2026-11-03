// Small promo tile (440x280) and marquee (1400x560) in English and Indonesian.
// The tile is drawn at 880x560 and downscaled, so text stays crisp.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { startServer, shot, BUILD_ROOT, EXT_ROOT } = require('./capture');

const OUT = path.join(EXT_ROOT, 'store', 'assets');
const TMP = path.join(BUILD_ROOT, 'tmp');
const ps = (...args) => {
  const r = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(BUILD_ROOT, 'img.ps1'), ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('img.ps1 failed: ' + r.stderr + r.stdout);
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(TMP, { recursive: true });
  const server = await startServer();
  try {
    for (const lang of ['en', 'id']) {
      // tile
      const rawTile = path.join(TMP, `tile-${lang}.png`);
      await shot(`http://localhost:5188/build/tile.html?kind=tile&lang=${lang}`, rawTile, { width: 880, height: 560, budget: 6000 });
      const small = path.join(TMP, `tile-${lang}-440.png`);
      ps('-Op', 'resize', '-In', rawTile, '-Out', small, '-W', '440', '-H', '280');
      ps('-Op', 'flatten', '-In', small, '-Out', path.join(OUT, `promo-tile-440x280-${lang}.png`));

      // marquee, with the real panel on the right
      const seed = { lang, mode: 'commons' };
      const run = [['search', 'Borobudur sunrise'], ['waitimg', 4]];
      const panel = 'http://localhost:5188/sidepanel.html?seed=' + encodeURIComponent(JSON.stringify(seed)) + '&run=' + encodeURIComponent(JSON.stringify(run));
      const rawM = path.join(TMP, `marquee-${lang}.png`);
      await shot(`http://localhost:5188/build/tile.html?kind=marquee&lang=${lang}&panel=${encodeURIComponent(panel)}`, rawM, { width: 1400, height: 560, budget: 40000 });
      ps('-Op', 'flatten', '-In', rawM, '-Out', path.join(OUT, `marquee-1400x560-${lang}.png`));
      console.log(lang, 'tile + marquee done');
    }
  } finally {
    server.close();
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
