// Location Tracking System
class LocationTracker {
  constructor() {
    this.watchId = null;
    this.currentPosition = null;
    this.updateInterval = 30000; // 30 seconds
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

    this.watchId = navigator.geolocation.watchPosition(
      position => {
        this.currentPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
          timestamp: position.timestamp
        };

        // Save to IndexedDB for offline access
        if (window.offlineSync) {
          window.offlineSync.saveLocation(this.currentPosition);
        }

        // Call callback with new position
        if (callback) callback(this.currentPosition);

        // Sync to backend if online
        if (navigator.onLine) {
          this.syncLocation(this.currentPosition);
        }
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
  }

  stopTracking() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  async syncLocation(position) {
    try {
      // Get current user and shipment from session
      const shipmentId = sessionStorage.getItem('activeShipmentId');
      if (!shipmentId) return;

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
      if (window.offlineSync) {
        window.offlineSync.savePendingSync({
          url: '/api/update-location',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          data: position
        });
      }
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
