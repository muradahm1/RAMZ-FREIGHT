// Location Tracking System
class LocationTracker {
  constructor() {
    this.watchId = null;
    this.currentPosition = null;
    this.updateInterval = 30000; // 30 seconds
    this.syncInterval = null;
    
    // Listen for network changes
    window.addEventListener('online', () => {
      console.log('Network online - syncing locations');
      this.syncOfflineLocations();
    });
    
    window.addEventListener('offline', () => {
      console.log('Network offline - queuing locations');
    });
  }

  async requestPermission() {
    if (!('geolocation' in navigator)) {
      throw new Error('Geolocation not supported');
    }

    return new Promise((resolve, reject) => {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        if (result.state === 'granted') {
          resolve(true);
        } else if (result.state === 'prompt') {
          this.getCurrentPosition()
            .then(() => resolve(true))
            .catch(reject);
        } else {
          reject(new Error('Location permission denied'));
        }
      });
    });
  }

  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        position => {
          this.currentPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          resolve(this.currentPosition);
        },
        error => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  startTracking(callback) {
    if (this.watchId) return;

    // Sync any offline locations first
    if (navigator.onLine) {
      this.syncOfflineLocations();
    }

    this.watchId = navigator.geolocation.watchPosition(
      position => {
        this.currentPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
          altitude: position.coords.altitude,
          timestamp: position.timestamp
        };

        // Save to IndexedDB for offline access
        if (window.offlineSync) {
          window.offlineSync.saveLocation(this.currentPosition);
        }

        // Call callback with new position
        if (callback) callback(this.currentPosition);

        // Always try to sync (will queue if offline)
        this.syncLocation(this.currentPosition);
      },
      error => {
        console.error('Location error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );

    // Set up periodic offline sync
    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.syncOfflineLocations();
      }
    }, 30000); // Every 30 seconds
  }

  stopTracking() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    // Final sync before stopping
    if (navigator.onLine) {
      this.syncOfflineLocations();
    }
  }

  async syncLocation(position) {
    try {
      // Get current user and shipment from session
      const shipmentId = sessionStorage.getItem('activeShipmentId') || localStorage.getItem('active_shipment_id');
      if (!shipmentId) return;

      // Try Supabase first (faster and more reliable)
      if (window.supabase) {
        const { error } = await window.supabase
          .from('shipment_tracking')
          .insert({
            shipment_id: shipmentId,
            latitude: position.latitude,
            longitude: position.longitude,
            speed: position.speed || 0,
            accuracy: position.accuracy || 0,
            heading: position.heading || 0,
            altitude: position.altitude || 0,
            timestamp: new Date(position.timestamp).toISOString()
          });

        if (error) throw error;
        console.log('Location synced via Supabase');
        return;
      }

      // Fallback to API endpoint
      const response = await fetch('/api/update-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipment_id: shipmentId,
          latitude: position.latitude,
          longitude: position.longitude,
          speed: position.speed || 0,
          timestamp: new Date(position.timestamp).toISOString()
        })
      });

      if (!response.ok) throw new Error('Location sync failed');
    } catch (error) {
      console.error('Failed to sync location:', error);
      // Save for later sync
      this.saveForOfflineSync(position);
    }
  }

  saveForOfflineSync(position) {
    try {
      const offlineQueue = JSON.parse(localStorage.getItem('location_offline_queue') || '[]');
      const shipmentId = sessionStorage.getItem('activeShipmentId') || localStorage.getItem('active_shipment_id');
      
      offlineQueue.push({
        shipment_id: shipmentId,
        latitude: position.latitude,
        longitude: position.longitude,
        speed: position.speed || 0,
        accuracy: position.accuracy || 0,
        timestamp: new Date(position.timestamp).toISOString(),
        queued_at: new Date().toISOString()
      });
      
      // Keep only last 100 positions to prevent memory issues
      if (offlineQueue.length > 100) {
        offlineQueue.splice(0, offlineQueue.length - 100);
      }
      
      localStorage.setItem('location_offline_queue', JSON.stringify(offlineQueue));
    } catch (e) {
      console.error('Failed to save offline location:', e);
    }
  }

  async syncOfflineLocations() {
    try {
      const offlineQueue = JSON.parse(localStorage.getItem('location_offline_queue') || '[]');
      if (offlineQueue.length === 0) return;

      console.log(`Syncing ${offlineQueue.length} offline locations...`);

      if (window.supabase) {
        // Batch insert for better performance
        const { error } = await window.supabase
          .from('shipment_tracking')
          .insert(offlineQueue);

        if (!error) {
          localStorage.removeItem('location_offline_queue');
          console.log('Offline locations synced successfully');
        }
      }
    } catch (error) {
      console.error('Failed to sync offline locations:', error);
    }
  }

  async getLastKnownLocation() {
    if (this.currentPosition) {
      return this.currentPosition;
    }

    // Try to get from IndexedDB
    if (window.offlineSync) {
      return await window.offlineSync.getLastLocation();
    }

    return null;
  }
}

// Export singleton
const locationTracker = new LocationTracker();
window.locationTracker = locationTracker;
