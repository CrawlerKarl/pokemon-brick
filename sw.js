'use strict';
// ============================================================
//  SERVICE WORKER (AFT-015) — installable + offline.
//  One source for both repos. The dist builder (tools/build-aetherfall-dist.js)
//  injects VERSION and the PRECACHE list; the workshop ships them empty/static,
//  so it only caches art as it is fetched (no 36 MB PNG precache).
//   - navigations / .html / .js / manifest : NETWORK-FIRST (revalidated, so a
//     deploy lands immediately when online), cache fallback offline.
//   - art / fonts / icons (png/webp/woff2/…): STALE-WHILE-REVALIDATE.
//   - non-GET, cross-origin, and any request with a `dev` query: untouched.
//  Every URL is resolved against the registration scope (sub-path safe).
// ============================================================
const VERSION = 'wb-dev'; // __VERSION__
const PRECACHE = []; // __PRECACHE__
const SHELL_CACHE = 'wb-shell-' + VERSION;
const ART_CACHE = 'wb-art-v1';
const SHELL_FILES = ['./', 'index.html', 'manifest.webmanifest', 'assets/fonts/orbitron.woff2',
  'assets/icons/icon-192.png', 'assets/icons/apple-touch-icon-180.png', 'assets/icons/favicon-32.png'];
const scoped = p => new URL(p, self.registration.scope).href;

self.addEventListener('install', e => {
  self.skipWaiting();
  // the shell (index + every module) is what makes offline boot possible; the
  // precache list (dist only) is the JS + remaining static files. Best-effort:
  // a failed fetch must never fail the install.
  e.waitUntil(caches.open(SHELL_CACHE).then(async c => {
    const files = SHELL_FILES.concat(PRECACHE.filter(p => !/\.webp$/.test(p)));
    await Promise.all(files.map(p => fetch(scoped(p), { cache: 'no-cache' })
      .then(r => { if (r.ok) return c.put(scoped(p), r); }).catch(() => {})));
  }));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) {
      if (k.startsWith('wb-') && k !== SHELL_CACHE && k !== ART_CACHE) await caches.delete(k);
    }
    await self.clients.claim();
  })());
  warmArt(); // background, deliberately NOT awaited
});

let warming = false, warmed = false;
async function warmArt() {
  if (warmed || warming) return; // one full sweep per worker lifetime is enough
  const art = PRECACHE.filter(p => /\.webp$/.test(p));
  if (!art.length) { warmed = true; return; }
  warming = true;
  try {
    const cache = await caches.open(ART_CACHE);
    for (let i = 0; i < art.length; i += 6) {
      await Promise.all(art.slice(i, i + 6).map(async p => {
        const u = scoped(p);
        try { if (await cache.match(u)) return; const r = await fetch(u); if (r.ok) await cache.put(u, r); } catch (err) {}
      }));
    }
    warmed = true;
  } catch (err) {}
  warming = false;
}

function isArt(url) { return /\.(png|webp|woff2|ico|svg|jpg)$/i.test(url.pathname); }

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.searchParams.has('dev')) return;
  if (isArt(url)) { e.respondWith(staleWhileRevalidate(req, url)); warmArt(); return; }
  e.respondWith(networkFirst(req, url));
});

async function networkFirst(req, url) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const r = await fetch(req.mode === 'navigate' ? url.href : req, { cache: 'no-cache' });
    // key by path only (the game takes ?skin= etc.), and only store real hits
    if (r.ok) cache.put(url.origin + url.pathname, r.clone()).catch(() => {});
    return r;
  } catch (err) {
    const hit = await cache.match(url.origin + url.pathname, { ignoreSearch: true })
      || (req.mode === 'navigate' && (await cache.match(scoped('index.html'), { ignoreSearch: true })
          || await cache.match(scoped('./'), { ignoreSearch: true })));
    if (hit) return hit;
    throw err;
  }
}

async function staleWhileRevalidate(req, url) {
  const cache = await caches.open(ART_CACHE);
  const key = url.origin + url.pathname;
  const hit = await cache.match(key) || await caches.match(key);
  const net = fetch(req).then(r => { if (r.ok) cache.put(key, r.clone()).catch(() => {}); return r; });
  if (hit) { net.catch(() => {}); return hit; }
  return net;
}
