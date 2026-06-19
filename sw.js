const CACHE_NAME = 'weather-pwa-v1';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap'
];

// Install Event
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS);
        })
    );
});

// Activate Event
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys.map(key => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
});

// Fetch Event
self.addEventListener('fetch', event => {
    // API call'larını cache'e atlamak veya farklı strateji izlemek daha iyi olabilir.
    // Şimdilik sadece statik dosyaları network-first veya cache-first olarak değerlendirebiliriz.
    if (event.request.url.includes('api.open-meteo.com') || event.request.url.includes('geocoding-api')) {
        // API çağrıları için Network First
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
    } else {
        // Statik dosyalar için Cache First
        event.respondWith(
            caches.match(event.request).then(cached => {
                return cached || fetch(event.request);
            })
        );
    }
});
