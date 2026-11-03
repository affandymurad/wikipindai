// Dev server for the promo site folder: node serve-site.js [dir] [port]
const http = require('http'), fs = require('fs'), path = require('path');
if (!process.argv[2]) { console.error('usage: node serve-site.js <promo-site-folder> [port]'); process.exit(1); }
const root = path.resolve(process.argv[2]);
const types = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.zip': 'application/zip', '.css': 'text/css', '.js': 'text/javascript' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => {
    if (e) { res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
    res.end(b);
  });
}).listen(Number(process.argv[3] || 5190), () => console.log('site up'));
