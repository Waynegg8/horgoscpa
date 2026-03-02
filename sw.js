const CACHE = 'horgoscpa-v1';

const PRECACHE = [
  '/assets/css/common.css',
  '/assets/css/organisms.css',
  '/assets/css/atoms.css',
  '/assets/js/main.js',
  '/assets/js/modules/components.js',
  '/assets/js/modules/ui-effects.js',
  '/assets/js/modules/faq.js',
  '/assets/js/modules/content-loader.js',
  '/assets/data/articles.json',
  '/assets/data/resources.json',
  '/assets/data/faq.json',
  '/assets/images/hero.webp',
  '/assets/images/hero-900w.webp',
  '/assets/images/logo-white.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  const isAsset = /\.(css|js|webp|jpg|png|json|woff2?)(\?|$)/.test(url.pathname);
  const isFont = url.hostname === 'fonts.gstatic.com';

  if (isAsset || isFont) {
    // Cache-first for static assets
    e.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(request, clone));
          }
          return res;
        })
      )
    );
  }
  // HTML: network-first (always get fresh HTML)
});
