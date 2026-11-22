const VERSION = 'pasko-v1';
const SHELL = ['/offline.html', '/manifest.webmanifest', '/favicon.png',
  '/icons/icon-192.png', '/icons/icon-512.png', '/icons/maskable-512.png', '/icons/apple-touch-icon.png',
  '/splash/pasko-splash-portrait.mp4', '/splash/pasko-splash-landscape.mp4'];
// Never cache logins, API calls, or payment/order data.
const SKIP = /^\/(api|auth|manual-payment|track|create)(\/|$|\?)/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== VERSION).map(n => caches.delete(n)))).then(() => self.clients.claim()));
});

// Safari/iOS plays video with Range requests, so answer them from the cached full file.
async function rangeFromCache(req) {
  const hit = await caches.match(req.url, { ignoreVary: true });
  if (!hit) return fetch(req);
  const buf = await hit.arrayBuffer();
  const m = /bytes=(\d+)-(\d*)/.exec(req.headers.get('range') || '');
  const start = m ? +m[1] : 0, end = m && m[2] ? +m[2] : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), { status: 206, headers: {
    'Content-Type': 'video/mp4', 'Content-Range': `bytes ${start}-${end}/${buf.byteLength}`, 'Content-Length': end - start + 1 } });
}

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (req.headers.has('range')) return e.respondWith(rangeFromCache(req));
  if (SKIP.test(url.pathname) && req.mode !== 'navigate') return;

  // Pages: network first, fall back to the last copy, then the offline page.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      if (res.ok && !SKIP.test(url.pathname)) { const c = res.clone(); caches.open(VERSION).then(x => x.put(req, c)); }
      return res;
    }).catch(async () => (await caches.match(req)) || (await caches.match('/offline.html'))));
    return;
  }
  // Static files: cached copy first, refreshed in the background.
  if (SKIP.test(url.pathname)) return;
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => { if (res.ok) { const c = res.clone(); caches.open(VERSION).then(x => x.put(req, c)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
