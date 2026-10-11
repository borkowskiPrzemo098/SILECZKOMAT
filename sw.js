/* SIŁECZKOMAT — tryb offline. Aplikacja z pamięci podręcznej, czcionki zapisywane przy pierwszym wczytaniu. */
const CACHE = 'silczkomat-v8';
const SHELL = ['./', 'index.html', 'style.css?v=6', 'data.js?v=6', 'figures.js?v=6', 'app.js?v=6', 'manifest.webmanifest', 'favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'fonts/fonts.css', 'fonts/unbounded-latin.woff2', 'fonts/unbounded-latin-ext.woff2', 'fonts/onest-latin.woff2', 'fonts/onest-latin-ext.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const font = url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !font) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put('index.html', cp)); return r; }).catch(() => caches.match('index.html')));
    return;
  }
  const put = r => { if (r.ok || r.type === 'opaque') { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; };
  if (font) { e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(put))); return; }
  // pliki aplikacji: najpierw sieć (świeża wersja), bez sieci kopia z pamięci
  e.respondWith(fetch(req).then(put).catch(() => caches.match(req, { ignoreSearch: true })));
});
