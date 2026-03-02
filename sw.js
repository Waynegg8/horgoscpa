const CACHE = 'horgoscpa-v2';

// Only cache fonts and core CSS on-demand (no precache to avoid blocking first load)
const CACHE_PATTERNS = /\.(css|woff2?)(\?|$)|fonts\.gstatic\.com/;

self.addEventListener('install', (e) => {
    // Skip precache entirely — let the first page load proceed unimpeded
    e.waitUntil(self.skipWaiting());
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

    if (request.method !== 'GET') return;

    const isFont = url.hostname === 'fonts.gstatic.com';
    const isLocalCSS = url.origin === self.location.origin && /\.css(\?|$)/.test(url.pathname);

    if (isFont || isLocalCSS) {
        // Cache-first for fonts and CSS (stable assets)
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
    // Everything else (HTML, JS, images) — let browser handle normally
});
