// Shared helpers for the store-asset build: a static server for the extension + build pages, and a
// headless Chrome screenshot helper. Not part of the extension package.
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const EXT_ROOT = path.resolve(__dirname, '..', '..');
const BUILD_ROOT = __dirname;
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']
  .find((p) => fs.existsSync(p));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };

// Stand-in for chrome.* so the real sidepanel.js runs in an ordinary page. The page it is embedded in
// chooses the data with ?seed=<json>, and may script a few UI steps with ?run=<json>.
const STUB = `<script>
(() => {
  const p = new URLSearchParams(location.search);
  const store = JSON.parse(p.get('seed') || '{}');
  window.chrome = {
    storage: {
      local: { get: async (d) => ({ ...(d && typeof d === 'object' && !Array.isArray(d) ? d : {}), ...store }), set: async (o) => Object.assign(store, o) },
      session: { get: async () => ({}), set: async () => {}, remove: async () => {} },
      onChanged: { addListener() {} }
    },
    windows: { getCurrent: async () => ({ id: 1 }) },
    runtime: { id: 'x' }
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitFor = async (fn, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { const v = fn(); if (v) return v; await sleep(100); } return null; };
  const $ = (s) => document.querySelector(s);
  window.addEventListener('load', async () => {
    const steps = JSON.parse(p.get('run') || '[]');
    await sleep(600);
    for (const [op, a, b] of steps) {
      if (op === 'mode') $('[data-mode="' + a + '"]').click();
      else if (op === 'search') { $('#q').value = a; $('#searchForm').requestSubmit(); await waitFor(() => $('#content .list li') || $('#content .state')); }
      else if (op === 'open') { await waitFor(() => $('#content .list .item')); document.querySelectorAll('#content .list .item')[a || 0].click(); await waitFor(() => $('#content .hero')); }
      else if (op === 'pickq') { await waitFor(() => $('#content .list .item')); [...document.querySelectorAll('#content .list .item')].find((i) => i.textContent.includes(a)).click(); await waitFor(() => $('#content .hero')); }
      else if (op === 'iw') { const h = await waitFor(() => $('.iwhead')); h.click(); }
      else if (op === 'tab') $('[data-tab="' + a + '"]').click();
      else if (op === 'save') document.querySelectorAll('#content .list .star')[a].click();
      else if (op === 'wait') await sleep(a);
      else if (op === 'waitimg') await waitFor(() => document.querySelectorAll('.thumbbox img').length >= (a || 3), 12000);
      else if (op === 'scroll') $('#main').scrollTop = a;
      await sleep(250);
    }
    await sleep(600);
    document.title = 'ready';
  });
})();
</script>`;

function startServer(port = 5188) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const rel = decodeURIComponent(url.pathname);
    const file = rel.startsWith('/build/') ? path.join(BUILD_ROOT, rel.slice(7)) : path.join(EXT_ROOT, rel === '/' ? 'sidepanel.html' : rel);
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); return res.end('not found: ' + rel); }
      let body = buf;
      if (file === path.join(EXT_ROOT, 'sidepanel.html')) {
        body = Buffer.from(buf.toString().replace('<script type="module"', STUB + '<script type="module"'));
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(body);
    });
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

// Screenshot a URL at an exact CSS size. `scale` multiplies the output resolution (device scale factor).
// Async on purpose: the static server lives in this process and must keep answering while Chrome loads.
function shot(url, out, { width, height, scale = 1, budget = 20000, transparent = false } = {}) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-shot-'));
  const args = [
    '--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
    '--user-data-dir=' + profile, '--window-size=' + width + ',' + height, '--force-device-scale-factor=' + scale,
    '--virtual-time-budget=' + budget, ...(transparent ? ['--default-background-color=00000000'] : []),
    '--screenshot=' + out, url
  ];
  return new Promise((resolve, reject) => {
    let err = '';
    const child = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    child.stderr.on('data', (d) => { err += d; });
    const timer = setTimeout(() => child.kill(), 150000);
    child.on('close', () => {
      clearTimeout(timer);
      try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* profile still locked */ }
      if (!fs.existsSync(out)) return reject(new Error('screenshot failed: ' + err.split('\n').slice(-3).join(' ')));
      const b = fs.readFileSync(out);
      resolve({ w: b.readUInt32BE(16), h: b.readUInt32BE(20), bytes: b.length });
    });
  });
}

module.exports = { EXT_ROOT, BUILD_ROOT, CHROME, startServer, shot };
