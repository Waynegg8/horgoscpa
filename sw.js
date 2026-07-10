const CACHE = 'fidera-v4';

self.addEventListener('install', (e) => {
    // 立即接管，不等舊 SW 釋放
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
    const isLocalAsset = url.origin === self.location.origin && /\.(css|js)(\?|$)/.test(url.pathname);

    if (isFont) {
        // 字型：cache-first（穩定資源，極少變動）
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
    } else if (isLocalAsset) {
        // 本站 CSS / JS：network-first 且繞過瀏覽器 HTTP 快取（cache: 'reload'），
        // 確保每次部署後立即取得最新版本；離線時才 fallback 到 Cache Storage。
        e.respondWith(
            fetch(request, { cache: 'reload' }).then((res) => {
                if (res.ok) {
                    const clone = res.clone();
                    caches.open(CACHE).then((c) => c.put(request, clone));
                }
                return res;
            }).catch(() => caches.match(request))
        );
    }
    // 其他（HTML、圖片）— 交由瀏覽器正常處理
});
