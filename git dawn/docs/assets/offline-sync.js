// Offline Data Sync Manager
class OfflineSync {
  constructor() {
    this.dbName = 'ramz-freight-db';
    this.dbVersion = 1;
    this.db = null;
    this.init();
  }

  async init() {
    this.db = await this.openDB();
    this.setupOnlineListener();
  }

  openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('shipments')) {
          db.createObjectStore('shipments', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pending-sync')) {
          db.createObjectStore('pending-sync', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('locations')) {
          db.createObjectStore('locations', { keyPath: 'timestamp' });
        }
      };
    });
  }

  async saveShipment(shipment) {
    const tx = this.db.transaction(['shipments'], 'readwrite');
    const store = tx.objectStore('shipments');
    await store.put(shipment);
  }

  async getShipments() {
    const tx = this.db.transaction(['shipments'], 'readonly');
    const store = tx.objectStore('shipments');
    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
    });
  }

  async savePendingSync(data) {
    const tx = this.db.transaction(['pending-sync'], 'readwrite');
    const store = tx.objectStore('pending-sync');
    await store.add({
      ...data,
      timestamp: Date.now()
    });
  }

  async saveLocation(location) {
    const tx = this.db.transaction(['locations'], 'readwrite');
    const store = tx.objectStore('locations');
    await store.put({
      ...location,
      timestamp: Date.now()
    });
  }

  async getLastLocation() {
    const tx = this.db.transaction(['locations'], 'readonly');
    const store = tx.objectStore('locations');
    return new Promise((resolve) => {
      const request = store.openCursor(null, 'prev');
      request.onsuccess = () => {
        const cursor = request.result;
        resolve(cursor ? cursor.value : null);
      };
    });
  }

  setupOnlineListener() {
    window.addEventListener('online', () => {
      console.log('Back online - syncing data...');
      this.syncPendingData();
      if ('serviceWorker' in navigator && 'sync' in navigator.serviceWorker) {
        navigator.serviceWorker.ready.then(reg => {
          reg.sync.register('sync-shipments');
          reg.sync.register('sync-location');
        });
      }
    });
  }

  async syncPendingData() {
    const tx = this.db.transaction(['pending-sync'], 'readonly');
    const store = tx.objectStore('pending-sync');
    const pending = await new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
    });

    for (const item of pending) {
      try {
        await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: JSON.stringify(item.data)
        });
        
        const deleteTx = this.db.transaction(['pending-sync'], 'readwrite');
        deleteTx.objectStore('pending-sync').delete(item.id);
      } catch (error) {
        console.error('Sync failed for item:', item, error);
      }
    }
  }

  isOnline() {
    return navigator.onLine;
  }
}

// Export singleton instance
const offlineSync = new OfflineSync();
window.offlineSync = offlineSync;
