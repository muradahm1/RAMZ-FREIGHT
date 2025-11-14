const CACHE_VERSION = 'ramz-freight-v4';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const OFFLINE_PAGE = './offline.html';

const STATIC_ASSETS = [
  './docs/homepage/homepage.html',
  './docs/assets/main.css',
  './docs/assets/translations.js',
  './docs/assets/supabaseClient.js'
];

// Install event - cache static assets safely
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        // Add files one by one to avoid failing on missing files
        return Promise.allSettled(
          STATIC_ASSETS.map(url => 
            cache.add(url).catch(err => console.warn(`Failed to cache ${url}:`, err))
          )
        );
      })
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

// Fetch event - optimized for speed
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Fast pass for Supabase - no caching interference
  if (request.url.includes('supabase.co')) {
    return; // Let browser handle directly
  }
  
  // Cache first for static assets (faster)
  if (request.url.includes('.css') || request.url.includes('.js') || request.url.includes('.png')) {
    event.respondWith(
      caches.match(request).then(response => {
        return response || fetch(request).then(fetchResponse => {
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, fetchResponse.clone()));
          return fetchResponse;
        });
      })
    );
    return;
  }
  
  // Network first for HTML (but faster)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, responseClone));
        }
        return response;
      }).catch(() => caches.match(request))
    );
  }
});



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
    data: data.data,
    sound: './assets/sounds/notification.mp3' // Path to your notification sound file
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
})
