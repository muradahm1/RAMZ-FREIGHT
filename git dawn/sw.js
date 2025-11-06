const CACHE_VERSION = 'ramz-freight-v4';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const OFFLINE_PAGE = './offline.html';

const STATIC_ASSETS = [
  './offline.html',
  './index.html',
  './docs/homepage/homepage.html',
  './docs/assets/main.css',
  './docs/assets/main.js',
  './docs/assets/translations.js',
  './docs/assets/language-switcher.js',
  './assets/images/icon.png',
  './assets/images/background.jpg',

  // Add core app pages for better offline experience
  './docs/shippers-login/shippers-login.html',
  './docs/shippers-login/shippers-login.js',
  './docs/shippers-dashboard/shippers-dashboard.html',
  './docs/shippers-dashboard/shippers-dashboard.js',
  './docs/trucks-login/trucks-login.html',
  './docs/trucks-login/trucks-login.js',
  './docs/trucks-dashboard-cheak/truck-dashboard.html',
  './docs/trucks-dashboard-cheak/truck-dashboard.js',
  './docs/live-tracking/live-tracking.html',
  './docs/live-tracking/live-tracking.js',
  './docs/assets/supabaseClient.js'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip Supabase API calls from caching
  if (request.url.includes('supabase.co')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ offline: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }
  
  // Network first strategy for HTML pages
  if (request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, responseClone));
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then(response => response || caches.match(OFFLINE_PAGE));
        })
    );
    return;
  }
  
  // Cache first strategy for assets
  event.respondWith(
    caches.match(request)
      .then(response => {
        return response || fetch(request)
          .then(fetchResponse => {
            return caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(request, fetchResponse.clone());
              return fetchResponse;
            });
          })
          .catch(() => {
            // Silently fail for external resources like placeholder images
            return new Response('', { status: 404, statusText: 'Not Found' });
          });
      })
  );
});

// Background sync for offline data
self.addEventListener('sync', event => {
  if (event.tag === 'sync-shipments') {
    event.waitUntil(syncShipmentData());
  }
  if (event.tag === 'sync-location') {
    event.waitUntil(syncLocationData());
  }
});

async function syncShipmentData() {
  try {
    const db = await openDB();
    const pendingData = await db.getAll('pending-sync');
    
    for (const item of pendingData) {
      await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: JSON.stringify(item.data)
      });
      await db.delete('pending-sync', item.id);
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

async function syncLocationData() {
  try {
    const db = await openDB();
    const locations = await db.getAll('pending-locations');
    
    for (const loc of locations) {
      await fetch('/api/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loc)
      });
      await db.delete('pending-locations', loc.id);
    }
  } catch (error) {
    console.error('Location sync failed:', error);
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ramz-freight-db', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-sync')) {
        db.createObjectStore('pending-sync', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('pending-locations')) {
        db.createObjectStore('pending-locations', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // If app is already open, focus it
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow('./');
        }
      })
  );
});

// Push notification handler
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: './assets/images/icon.png',
    badge: './assets/images/icon.png',
    vibrate: [200, 100, 200],
    data: data.data
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
})
