/* La Caza del Tesoro — service worker
   Precarga la cáscara (juego jugable offline en local/IA).
   La música y las fuentes se cachean la primera vez que se usan.
   El online (Firebase) siempre va a la red; no se cachea. */
const VERSION = 'caza-v9';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Nunca cachear Firebase ni sus llamadas: el online necesita datos frescos.
  if (/firebaseio|firebasedatabase|googleapis|gstatic\.com\/firebasejs|identitytoolkit/.test(url.href)) {
    return; // deja pasar a la red por defecto
  }

  // Navegación: intenta red, cae a la cáscara cacheada (offline).
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Resto (música, iconos, fuentes): cache-first, y guarda lo nuevo.
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        try {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {});
        } catch (_) {}
        return res;
      }).catch(() => hit);
    })
  );
});
