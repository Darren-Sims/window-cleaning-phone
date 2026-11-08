/* Window Cleaning (phone) — offline helper ("service worker").
   It keeps a copy of the app's own files on the phone so the app opens with no signal.
   It only ever stores and fetches the app's files. Your round is never sent anywhere:
   it lives in the phone's storage, which this file doesn't touch. */
const CACHE = 'wc-phone-1.3.2';   // change this whenever the app's files change
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png'];

// First visit: save the app's files.
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
// A new version took over: delete the old saved copy.
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Opening the app: use the saved copy straight away (works offline). If there's signal,
// quietly check for a newer version of the app's files for next time.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const saved = await cache.match(req, { ignoreSearch: true });
    const fresh = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    if (saved) { e.waitUntil(fresh); return saved; }
    return (await fresh) || new Response('Offline', { status: 503 });
  }));
});
