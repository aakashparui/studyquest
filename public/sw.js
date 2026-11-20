/*
 * StudyQuest service worker.
 *
 * Strategy:
 *   - navigations   -> network first, falling back to the cached shell, so a
 *                      rebuild is picked up as soon as you are online again
 *                      and the app still opens with no connection at all.
 *   - static assets -> cache first (filenames are content-hashed, so a cached
 *                      hit is always the right file), then filled from the
 *                      network on a miss.
 *
 * Each build gets its own cache name, and older caches are dropped when the
 * new worker activates.
 */

/* Both constants are rewritten by scripts/inject-precache.mjs after a build,
 * so every build precaches its own hashed assets under its own cache name. */
const BUILD_ID = 'dev';
const BUILT_ASSETS = [];

const CACHE_NAME = `studyquest-${BUILD_ID}`;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  ...BUILT_ASSETS,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // One bad URL must not fail the whole install.
      await Promise.allSettled(APP_SHELL.map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

/*
 * Module scripts are fetched in CORS mode and therefore carry an Origin
 * header, while precached entries were stored without one. Hosts that send
 * `Vary: Origin` (Vite's preview server does) would then miss on every
 * lookup, so Vary is ignored: these are same-origin, content-hashed files.
 */
const MATCH_OPTIONS = { ignoreVary: true };

function isCacheable(response) {
  return Boolean(
    response && response.status === 200 && (response.type === 'basic' || response.type === 'default'),
  );
}

async function handleNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(request);
    if (isCacheable(fresh)) cache.put('./index.html', fresh.clone());
    return fresh;
  } catch {
    const cached =
      (await cache.match('./index.html', MATCH_OPTIONS)) ??
      (await cache.match('./', MATCH_OPTIONS));
    if (cached) return cached;
    return new Response('StudyQuest is offline and has nothing cached yet.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

async function handleAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, MATCH_OPTIONS);
  if (cached) return cached;

  const fresh = await fetch(request);
  if (isCacheable(fresh)) cache.put(request, fresh.clone());
  return fresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Vite's dev/HMR endpoints must always go straight to the network.
  if (url.pathname.startsWith('/@') || url.pathname.includes('/node_modules/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  event.respondWith(handleAsset(request));
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') void self.skipWaiting();
});
