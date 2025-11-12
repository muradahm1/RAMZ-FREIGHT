// Service Worker for RAMZ-FREIGHT PWA
const CACHE_NAME = 'ramz-freight-v1';
const urlsToCache = [
  './homepage/homepage.html',
  './assets/main.css',
  './assets/main.js',
  './assets/notifications.js',
  './assets/supabaseClient.js',
  './manifest.json'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Background sync for notifications
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New notification from RAMZ-FREIGHT',
    icon: '/docs/assets/images/icon.png',
    badge: '/docs/assets/images/icon.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
        icon: '/docs/assets/images/icon.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/docs/assets/images/icon.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('RAMZ-FREIGHT', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    // Open the app
    event.waitUntil(
      clients.openWindow('/docs/homepage/homepage.html')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open app
    event.waitUntil(
      clients.openWindow('/docs/homepage/homepage.html')
    );
  }
});

async function doBackgroundSync() {
  // Background sync logic for notifications
  console.log('Background sync triggered');
}