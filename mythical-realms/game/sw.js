// Service Worker for Mythical Realms PWA
var CACHE_NAME = 'mythical-realms-v3';

var ASSETS_TO_CACHE = [
    '/mythical-realms/game/',
    '/mythical-realms/game/index.html',
    '/mythical-realms/game/js/main.js',
    '/mythical-realms/game/js/hex-grid.js',
    '/mythical-realms/game/js/camera.js',
    '/mythical-realms/game/js/input.js',
    '/mythical-realms/game/js/game-state.js',
    '/mythical-realms/game/js/resources.js',
    '/mythical-realms/game/js/buildings.js',
    '/mythical-realms/game/js/turn.js',
    '/mythical-realms/game/js/tech-tree.js',
    '/mythical-realms/game/js/storyteller.js',
    '/mythical-realms/game/js/units.js',
    '/mythical-realms/game/js/sound.js',
    '/mythical-realms/game/js/tutorial.js',
    '/mythical-realms/game/js/victory.js',
    '/mythical-realms/game/js/ai-opponent.js',
    '/mythical-realms/game/js/asset-loader.js',
    '/mythical-realms/game/js/animation.js',
    '/mythical-realms/game/js/multiplayer.js',
    '/mythical-realms/game/js/map-gen.js',
    '/mythical-realms/game/js/supabase-config.js',
    '/mythical-realms/game/manifest.json',
    '/mythical-realms/game/icons/icon-192.png',
    '/mythical-realms/game/icons/icon-512.png',
    '/mythical-realms/game/assets/models/props/tree_oak.glb',
    '/mythical-realms/game/assets/models/props/tree_pine.glb',
    '/mythical-realms/game/assets/models/props/tree_willow.glb',
    '/mythical-realms/game/assets/models/props/rock_large.glb',
    '/mythical-realms/game/assets/models/props/rock_small.glb',
    '/mythical-realms/game/assets/models/props/grass.glb',
    '/mythical-realms/game/assets/models/buildings/town_center.glb',
    '/mythical-realms/game/assets/models/buildings/farm.glb',
    '/mythical-realms/game/assets/models/buildings/lumber_mill.glb',
    '/mythical-realms/game/assets/models/buildings/quarry.glb',
    '/mythical-realms/game/assets/models/buildings/mine.glb',
    '/mythical-realms/game/assets/models/buildings/barracks.glb',
    '/mythical-realms/game/assets/models/buildings/mage_tower.glb',
    '/mythical-realms/game/assets/models/buildings/walls.glb',
    '/mythical-realms/game/assets/models/units/worker.glb',
    '/mythical-realms/game/assets/models/units/warrior.glb',
    '/mythical-realms/game/assets/models/units/archer.glb',
    '/mythical-realms/game/assets/models/units/mage.glb',
    '/mythical-realms/game/assets/models/units/hero.glb'
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
