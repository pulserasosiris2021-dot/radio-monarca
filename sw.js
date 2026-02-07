const CACHE_NAME = 'radio-monarca-v6';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/manifest.json',
    '/logo_monarca.png',
    '/background_monarca.jpg',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

// Install event - Cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate event - Clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => {
                        console.log('[SW] Removing old cache:', key);
                        return caches.delete(key);
                    })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - Cache-first for static, Network-first for API
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip audio streams - always network
    if (url.href.includes('stream') || url.href.includes('zeno.fm') || url.href.includes('.mp3')) {
        return;
    }

    // Skip API calls - always network
    if (url.pathname.startsWith('/api') || url.hostname.includes('supabase')) {
        return event.respondWith(fetch(event.request));
    }

    // Static assets - Cache first, then network
    if (isStaticAsset(url.pathname)) {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                if (cached) {
                    // Return cache immediately, update in background
                    fetchAndUpdate(event.request);
                    return cached;
                }
                return fetchAndCache(event.request);
            })
        );
        return;
    }

    // HTML pages - Network first, cache fallback
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});

function isStaticAsset(pathname) {
    return pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|woff2?|ttf|eot)$/i);
}

function fetchAndCache(request) {
    return fetch(request).then((response) => {
        if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
    });
}

function fetchAndUpdate(request) {
    fetch(request).then((response) => {
        if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response));
        }
    }).catch(() => { });
}

// Handle messages from app
self.addEventListener('message', (event) => {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});
