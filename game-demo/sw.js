// Service Worker for Mythical Realms PWA
var CACHE_NAME = 'mythical-realms-v1';

var ASSETS_TO_CACHE = [
    '/game-demo/',
    '/game-demo/index.html',
    '/game-demo/js/main.js',
    '/game-demo/js/hex-grid.js',
    '/game-demo/js/camera.js',
    '/game-demo/js/input.js',
    '/game-demo/js/game-state.js',
    '/game-demo/js/resources.js',
    '/game-demo/js/buildings.js',
    '/game-demo/js/turn.js',
    '/game-demo/js/tech-tree.js',
    '/game-demo/js/storyteller.js',
    '/game-demo/js/units.js',
    '/game-demo/js/sound.js',
    '/game-demo/js/tutorial.js',
    '/game-demo/js/victory.js',
    '/game-demo/js/ai-opponent.js',
    '/game-demo/js/asset-loader.js',
    '/game-demo/js/animation.js',
    '/game-demo/js/multiplayer.js',
    '/game-demo/js/map-gen.js',
    '/game-demo/js/supabase-config.js',
    '/game-demo/manifest.json',
    '/game-demo/icons/icon-192.png',
    '/game-demo/icons/icon-512.png'
];

// CDN assets cached on first use (network-first)
var CDN_HOSTS = [
    'unpkg.com'
];

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(function() {
            return self.skipWaiting();
        })
    );
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(names) {
            return Promise.all(
                names.filter(function(name) {
                    return name !== CACHE_NAME;
                }).map(function(name) {
                    return caches.delete(name);
                })
            );
        }).then(function() {
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', function(event) {
    var url = new URL(event.request.url);

    // For local assets: cache-first
    if (url.origin === self.location.origin) {
        event.respondWith(
            caches.match(event.request).then(function(cached) {
                if (cached) return cached;
                return fetch(event.request).then(function(response) {
                    if (response.ok) {
                        var clone = response.clone();
                        caches.open(CACHE_NAME).then(function(cache) {
                            cache.put(event.request, clone);
                        });
                    }
                    return response;
                });
            })
        );
        return;
    }

    // For CDN assets (Three.js, Supabase): network-first, fallback to cache
    var isCDN = CDN_HOSTS.some(function(host) {
        return url.hostname.indexOf(host) !== -1;
    });

    if (isCDN) {
        event.respondWith(
            fetch(event.request).then(function(response) {
                if (response.ok) {
                    var clone = response.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            }).catch(function() {
                return caches.match(event.request);
            })
        );
        return;
    }

    // Everything else: network only
    event.respondWith(fetch(event.request));
});
