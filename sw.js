/* سرویس‌ورکر پاسور ۱۱
   وظیفه: کش‌کردن فایل‌های اصلی بازی تا بعد از اولین بار باز شدن،
   بدون نیاز به اینترنت هم به‌طور کامل اجرا شود. */
const CACHE_NAME = 'pasur11-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// استراتژی: اول کش (Cache First) با بازگشت به شبکه در صورت نبود در کش
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          // نسخه تازه را هم در کش ذخیره می‌کنیم تا دفعه بعد هم موجود باشد
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => cached);
    })
  );
});
