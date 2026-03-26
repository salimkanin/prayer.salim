// service-worker.js
const CACHE_NAME = 'prayer-times-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/prayers.json',
  '/manifest.json'
];

// تثبيت Service Worker وتخزين الملفات الأساسية
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('تم فتح cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// إستراتيجية التخزين المؤقت: Network First ثم Cache
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // نسخ الاستجابة للتخزين المؤقت
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // إذا فشل الاتصال بالشبكة، نستخدم التخزين المؤقت
        return caches.match(event.request);
      })
  );
});

// تحديث Service Worker وتنظيف الـ Cache القديم
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});