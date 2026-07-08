/* سرویس‌ورکر پاسور ۱۱
   وظیفه: کش‌کردن فایل‌های اصلی بازی تا بعد از اولین بار باز شدن،
   بدون نیاز به اینترنت هم به‌طور کامل اجرا شود. */
const CACHE_NAME = 'pasur11-cache-v3';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // هر فایل جدا کش می‌شود (نه با addAll) تا اگر یکی از فایل‌ها به هر دلیلی
      // در دسترس نبود، نصب کل سرویس‌ورکر شکست نخورد و بقیه‌ی فایل‌ها کش شوند
      await Promise.all(ASSETS.map(async (url) => {
        try {
          const res = await fetch(url, { cache: 'no-cache' });
          if (res && res.ok) await cache.put(url, res);
        } catch (e) { /* این فایل موقتاً در دسترس نبود؛ نادیده گرفته می‌شود */ }
      }));
    })
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

// فقط درخواست‌های هم‌مبدأ (خود بازی و تصاویر کارت‌ها) توسط این سرویس‌ورکر مدیریت می‌شوند؛
// درخواست‌های بیرونی (مثل اسکریپت گوگل یا تلگرام) دست‌نخورده به شبکه می‌روند.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // صفحه‌ی اصلی بازی و تصاویر داخل پوشه‌ی cards/ : «اول شبکه» تا هر تغییری
  // (مثل عکس کارت‌های جدید یا آپدیت خود بازی) که در گیت‌هاب می‌گذارید، بلافاصله
  // برای کاربرِ آنلاین اعمال شود؛ فقط وقتی آفلاین باشد از نسخه‌ی کش‌شده استفاده می‌شود.
  const isCoreOrCards = event.request.mode === 'navigate'
    || url.pathname.endsWith('/index.html')
    || url.pathname.includes('/cards/');

  if (isCoreOrCards) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(()=>{});
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // بقیه‌ی فایل‌ها (آیکون‌ها، manifest و ...) که کمتر تغییر می‌کنند: اول کش برای سرعت بیشتر،
  // با به‌روزرسانی خاموش در پس‌زمینه برای دفعه‌ی بعد
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(()=>{});
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

