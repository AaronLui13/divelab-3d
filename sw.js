/* The Vite build plugin replaces these markers with a content hash and every local asset. */
const BUILD_ID = 'dfa6f7d3a91be920';
const PRECACHE_FILES = ["assets/index-BUbX9ySX.js","assets/index-HabjBM9w.css","favicon.svg","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","icons/icon.svg","index.html","manifest.webmanifest"];
const BASE_URL = self.registration.scope;
const CACHE_PREFIX = `divelab-3d-${encodeURIComponent(new URL(BASE_URL).pathname)}-`;
const CACHE_NAME = `${CACHE_PREFIX}${BUILD_ID}`;
const ASSET_URLS = new Set(PRECACHE_FILES.map((file) => new URL(file, BASE_URL).href));
const INDEX_URL = new URL('index.html', BASE_URL).href;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_FILES.map((file) => new Request(new URL(file, BASE_URL), { cache: 'reload' })));
    } catch (error) {
      await caches.delete(CACHE_NAME);
      throw error;
    }
    // Leave updates waiting while a dive is open. No automatic reload or skipWaiting.
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(BASE_URL)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (!response.ok) throw new Error('Navigation unavailable');
        // Preserve this build's precached HTML. A newer network page can reference chunks
        // this waiting worker does not own; overwriting the old shell would break offline.
        return response;
      } catch {
        const cached = await cache.match(INDEX_URL);
        return cached ?? new Response('<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>DiveLab 離線</title><body style="background:#071e26;color:white;font-family:system-ui;padding:2rem"><h1>首次開啟需要網絡</h1><p>請連線後開啟 DiveLab，讓裝置儲存完整 3D 訓練內容。</p></body></html>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
    })());
    return;
  }

  url.search = '';
  if (!ASSET_URLS.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(url.href);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') await cache.put(url.href, response.clone());
    return response;
  })());
});
