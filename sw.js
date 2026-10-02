// Service worker: l'app funziona offline dopo la prima visita. Incrementa VERSION a ogni nuova build.
const VERSION = 'muqvcw56';
const CACHE = 'piano-alimentare-' + VERSION;
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-180.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Rete per prima (così gli aggiornamenti arrivano subito), cache come ripiego offline.
// Condivisione da altre app (es. WhatsApp): il PDF arriva in POST, lo metto da parte e apro l'app.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    e.respondWith((async () => {
      try {
        const form = await e.request.formData();
        const file = form.get('pdf');
        if (file && file.size) {
          const c = await caches.open('piano-shared');
          await c.put('shared.pdf', new Response(file, { headers: { 'Content-Type': 'application/pdf', 'X-Filename': encodeURIComponent(file.name || 'piano.pdf') } }));
        }
      } catch (err) { /* ignora: l'app mostrerà il normale caricamento */ }
      return Response.redirect('./?shared=1', 303);
    })());
    return;
  }
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html')))
  );
});
