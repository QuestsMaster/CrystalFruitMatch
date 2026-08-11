const CACHE_PREFIX = 'crystal-fruit-match-shell-';
const CACHE_NAME = `${CACHE_PREFIX}2026-08-10-final-fix-1`;
const CORE_ASSETS = ['./', './index.html', './manifest.webmanifest', './icons/icon.svg', './sw.js'];

async function precacheAppShell() {
  try {
    const response = await fetch('./', { cache: 'no-store' });
    if (!response.ok) throw new Error('Unable to precache the app shell.');

    const html = await response.clone().text();
    const assetUrls = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))(?:\?[^"']*)?["']/g)]
      .map((match) => match[1]);
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([...new Set([...CORE_ASSETS, ...assetUrls])]);
    await cache.put('./', response);
  } catch (error) {
    await caches.delete(CACHE_NAME);
    throw error;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheAppShell());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request);
    if (cached) return cached;
    try {
      return await fetch(event.request);
    } catch (error) {
      if (event.request.mode === 'navigate') {
        return (await cache.match('./')) ?? (await cache.match('./index.html')) ?? Response.error();
      }
      throw error;
    }
  })());
});
