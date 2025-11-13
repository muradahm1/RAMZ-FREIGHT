import { supabase } from './supabaseClient.js';

class LocationTracker {
    constructor() {
        this.watchId = null;
        this.currentShipmentId = null;
        this.isTracking = false;
    }

    /**
     * Start tracking location for a specific shipment
     */
    async startTracking(shipmentId) {
        if (!navigator.geolocation) {
            throw new Error('Geolocation is not supported by this browser');
        }

        this.currentShipmentId = shipmentId;
        this.isTracking = true;

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        this.watchId = navigator.geolocation.watchPosition(
            (position) => this.updateLocation(position),
            (error) => this.handleLocationError(error),
            options
        );

        console.log('Location tracking started for shipment:', shipmentId);
    }

    /**
     * Stop tracking location
     */
    stopTracking() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        this.isTracking = false;
        this.currentShipmentId = null;
        console.log('Location tracking stopped');
    }

    /**
     * Update location in database
     */
    async updateLocation(position) {
        if (!this.currentShipmentId || !this.isTracking) return;

        const { latitude, longitude, speed } = position.coords;

        try {
            const { error } = await supabase
                .from('shipment_tracking')
                .insert({
                    shipment_id: this.currentShipmentId,
                    latitude: latitude,
                    longitude: longitude,
                    speed: speed || 0,
                    timestamp: new Date().toISOString()
                });

            if (error) {
                console.error('❌ Error updating location:', error);
            } else {
                console.log('✅ Location updated:', { shipmentId: this.currentShipmentId, latitude, longitude, speed });
            }
        } catch (err) {
            console.error('❌ Failed to update location:', err);
        }
    }

    /**
     * Handle geolocation errors
     */
    handleLocationError(error) {
        let message;
        switch (error.code) {
            case error.PERMISSION_DENIED:
                message = "Location access denied by user.";
                break;
            case error.POSITION_UNAVAILABLE:
                message = "Location information is unavailable.";
                break;
            case error.TIMEOUT:
                message = "Location request timed out.";
                break;
            default:
                message = "An unknown error occurred.";
                break;
        }
        console.error('Location error:', message);
    }

    /**
     * Get current tracking status
     */
    getTrackingStatus() {
        return {
            isTracking: this.isTracking,
            shipmentId: this.currentShipmentId
        };
    }
}

// Export singleton instance
export const locationTracker = new LocationTracker();

// Also expose to window for non-module scripts
if (typeof window !== 'undefined') {
    window.locationTracker = locationTracker;
}