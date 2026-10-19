const CACHE_NAME = 'tutu-pwa-v18';
const urlsToCache = [
  './',
  './index.html',
  './bunny.html',
  './mailbox.html',
  './admin.html',
  './manifest.json',
  './css/app.css',
  './js/config.js',
  './js/api.js',
  './js/app.js',
  './js/secret.js',
  './js/lists.js',
  './js/ideas.js',
  './js/shop.js',
  './js/notify.js',
  './js/bunny.js',
  './images/art/lock-door.jpg',
  './images/art/hero-island.jpg',
  './images/art/bunny-messenger.jpg',
  './images/art/feed-bunny.jpg',
  './images/IMG_4011-icon-1024.png',
  './images/IMG_4011-icon-512.png',
  './images/IMG_4011-icon-192.png'
];

// 安裝 Service Worker：安全快取核心資源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      console.log('[SW] 正在快取核心靜態資源...');
      await Promise.allSettled(
        urlsToCache.map(async url => {
          try {
            await cache.add(url);
          } catch (err) {
            console.warn('[SW] 快取略過:', url, err);
          }
        })
      );
    })
  );
  self.skipWaiting();
});

// 啟用 Service Worker：刪除所有舊版本快取並立即接管控制權
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] 刪除舊快取:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 攔截請求
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // 1. 不攔截外部 API（例如 Google Apps Script 後台），確保即時性
  if (url.origin !== self.location.origin) {
    return;
  }

  // 2. 忽略非 http/https
  if (!url.protocol.startsWith('http')) {
    return;
  }

  const isNavigation = event.request.mode === 'navigate' ||
    (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'));

  // 3. HTML 頁面：網路優先 (Network First)
  // 只要有網路就向伺服器拿最新版，並自動更新快取；沒網路時才回退離線快取
  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return caches.match('./index.html');
        })
    );
    return;
  }

  // 4. 靜態資源 (CSS, JS, 圖片)：Stale-While-Revalidate
  // 先快速回傳快取提升速度，同時在背景抓最新版本覆蓋快取
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});

// 推播通知
self.addEventListener('push', event => {
  const options = {
    body: '兔兔想念妳了，快來看看是否有新信息！',
    icon: 'images/IMG_4011-icon-192.png',
    badge: 'images/IMG_4011-icon-192.png',
    tag: 'tutu-notification',
    requireInteraction: false
  };

  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.body || options.body;
    } catch (e) {
      options.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification('秘密基地', options)
  );
});

// 通知點擊事件
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (let client of clientList) {
        if (client.url.includes('/tutu/') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./');
      }
    })
  );
});
