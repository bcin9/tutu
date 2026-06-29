const CACHE_NAME = 'tutu-pwa-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/service-worker.js'
];

// 安裝 Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('快取已開啟');
      return cache.addAll(urlsToCache);
    }).catch(err => {
      console.log('快取失敗:', err);
    })
  );
  self.skipWaiting();
});

// 啟用 Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('刪除舊快取:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 攔截網路請求 (Cache First 策略)
self.addEventListener('fetch', event => {
  // 只處理 GET 請求
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      // 如果快取中有，直接返回
      if (response) {
        return response;
      }

      // 否則嘗試從網路獲取
      return fetch(event.request).then(response => {
        // 檢查是否有效的響應
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // 複製響應到快取
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(() => {
        // 網路失敗時的備用方案
        console.log('無法從網路獲取資源');
        // 可以返回一個離線頁面或默認響應
        return caches.match(event.request);
      });
    })
  );
});

// 背景同步 (當網路恢復時重試失敗的請求)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-pages') {
    event.waitUntil(
      fetch('/').then(response => {
        console.log('背景同步成功');
        return response;
      }).catch(err => {
        console.log('背景同步失敗:', err);
      })
    );
  }
});

// 推播通知 (可選)
self.addEventListener('push', event => {
  const options = {
    body: '兔兔想念妳了，快來看看是否有新信息！',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%23FFB7B2" width="192" height="192"/><text x="50%" y="50%" font-size="120" dy=".3em" text-anchor="middle" dominant-baseline="middle" font-family="system-ui">🐰</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect fill="%23FFB7B2" width="96" height="96" rx="22"/><text x="50%" y="50%" font-size="60" dy=".3em" text-anchor="middle" dominant-baseline="middle" font-family="system-ui">🐰</text></svg>',
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
    self.registration.showNotification('兔兔的彩虹星球', options)
  );
});

// 通知點擊事件
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // 檢查是否有已開啟的視窗
      for (let client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // 如果沒有，開啟新視窗
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
