import { supabase } from '../assets/supabaseClient.js';

let map;
let truckMarker;
let routePolyline;
let trackingInterval;

// --- Mock Data for Simulation ---
document.addEventListener('DOMContentLoaded', async () => {
    supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            // User is logged in, initialize the tracking page
            initializeTrackingPage(session.user);
        } else {
            // User is not logged in, redirect
            window.location.replace('../shippers-login/shippers-login.html');
        }
    });
});

async function initializeTrackingPage(currentUser) {
    initMap();
    await loadShipments(currentUser);
    document.getElementById('shipmentSelect').addEventListener('change', loadShipmentTracking);
    document.getElementById('realTimeBtn').addEventListener('click', startRealTimeTracking);
}

function initMap() {
    map = L.map('trackingMap').setView([9.02497, 38.74689], 7); // Center on Addis Ababa

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Custom truck icon
    const truckIcon = L.icon({
        iconUrl: 'https://img.icons8.com/ios-filled/50/ff6b35/truck.png',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });

    truckMarker = L.marker([0, 0], { icon: truckIcon }).addTo(map);
}

/**
 * Fetches shipments for the current shipper that are ready for tracking.
 */
async function loadShipments(currentUser) {
    const shipmentSelect = document.getElementById('shipmentSelect');
    shipmentSelect.innerHTML = '<option value="">Loading trackable shipments...</option>';

    try {
        // Fetch shipments that belong to the shipper and are accepted or in transit
        const { data: shipments, error } = await supabase
            .from('shipments')
            .select('*')
            .eq('shipper_id', currentUser.id)
            .in('status', ['accepted', 'in_transit']);

        if (error) throw error;

        if (shipments.length === 0) {
            shipmentSelect.innerHTML = '<option value="">No shipments available for tracking</option>';
            return;
        }

        shipmentSelect.innerHTML = '<option value="">Choose a shipment to track</option>';
        shipments.forEach(shipment => {
            const option = document.createElement('option');
            option.value = shipment.id;
            option.textContent = `To: ${shipment.destination_address} (${shipment.goods_description})`;
            shipmentSelect.appendChild(option);
        });
    } catch (err) {
        console.error('Error loading shipments:', err);
        shipmentSelect.innerHTML = '<option value="">Failed to load shipments</option>';
    }
}

/**
 * Loads the tracking details for the selected shipment.
 */
async function loadShipmentTracking() {
    clearInterval(trackingInterval); // Stop any previous tracking

    const shipmentId = document.getElementById('shipmentSelect').value;
    if (!shipmentId) {
        resetUI();
        return;
    }
    
    try {
        // Fetch the selected shipment
        const { data: shipment, error } = await supabase
            .from('shipments')
            .select('*')
            .eq('id', shipmentId)
            .single();

        // Get truck owner and vehicle details
        let truckOwnerDetails = null;
        let vehicleDetails = null;
        if (shipment && shipment.truck_owner_id) {
            const { data: ownerData } = await supabase
                .from('truck_owners')
                .select('*')
                .eq('user_id', shipment.truck_owner_id)
                .single();
            
            const { data: authData } = await supabase.auth.admin.getUserById(shipment.truck_owner_id);
            truckOwnerDetails = { ...ownerData, ...authData?.user?.user_metadata };
            
            if (shipment.vehicle_id) {
                const { data: vehicle } = await supabase
                    .from('vehicles')
                    .select('*')
                    .eq('id', shipment.vehicle_id)
                    .single();
                vehicleDetails = vehicle;
            }
        }

        if (error) throw error;
        if (!shipment) {
            alert('Shipment data not found!');
            return;
        }

        // Update UI elements
        document.getElementById('trackingDetails').innerHTML = `
            <p><strong>From:</strong> ${shipment.origin_address}</p>
            <p><strong>To:</strong> ${shipment.destination_address}</p>
        `;
        document.getElementById('driverName').textContent = truckOwnerDetails?.full_name || 'N/A';
        document.getElementById('driverPhone').textContent = truckOwnerDetails?.phone || 'N/A';
        document.getElementById('vehicleInfo').textContent = vehicleDetails 
            ? `${vehicleDetails.vehicle_model} (${vehicleDetails.license_plate})` 
            : 'Vehicle details not available';

        // Set driver photo if available
        const driverPhotoEl = document.getElementById('driverPhoto');
        if (driverPhotoEl) {
            driverPhotoEl.src = truckOwnerDetails?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(truckOwnerDetails?.full_name || 'Driver')}`;
        }

        // Get latest tracking data to show current position
        const { data: latestTracking } = await supabase
            .from('shipment_tracking')
            .select('*')
            .eq('shipment_id', shipmentId)
            .order('timestamp', { ascending: false })
            .limit(1);

        // --- ROUTE SETUP ---
        // Geocode addresses to get actual coordinates
        const originCoord = await geocodeAddress(shipment.origin_address);
        const destCoord = await geocodeAddress(shipment.destination_address);
        
        // Only draw route line from pickup to destination
        if (routePolyline) map.removeLayer(routePolyline);
        routePolyline = L.polyline([originCoord, destCoord], { 
            color: '#ff6b35',
            weight: 4,
            opacity: 0.7
        }).addTo(map);
        
        // Add markers for pickup and destination
        L.marker(originCoord, {
            icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41]
            })
        }).addTo(map).bindPopup('Pickup');
        
        L.marker(destCoord, {
            icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41]
            })
        }).addTo(map).bindPopup('Destination');
        
        map.fitBounds(routePolyline.getBounds().pad(0.1));
        
        // Set truck position from GPS data
        if (latestTracking?.length > 0) {
            const truckPos = L.latLng(latestTracking[0].latitude, latestTracking[0].longitude);
            truckMarker.setLatLng(truckPos);
            map.setView(truckPos, 13);
        } else {
            truckMarker.setLatLng(originCoord);
        }

        // Update status
        const statusBadge = document.getElementById('trackingStatus');
        statusBadge.querySelector('span').textContent = shipment.status;
        statusBadge.className = `status-badge status-${shipment.status.toLowerCase()}`;

    } catch (err) {
        console.error('Error loading shipment tracking:', err);
        alert('Failed to load tracking details for this shipment.');
    }
}

function startRealTimeTracking() {
    const shipmentId = document.getElementById('shipmentSelect').value;
    if (!shipmentId) {
        alert('Please select a shipment first.');
        return;
    }

    // Check the status from the UI instead of re-fetching
    const status = document.getElementById('trackingStatus').querySelector('span').textContent.toLowerCase();
    if (status !== 'in_transit' && status !== 'accepted') {
        alert('This shipment is not ready for tracking. Tracking is only available for accepted or in-transit shipments.');
        return;
    }

    clearInterval(trackingInterval); // Ensure no multiple intervals

    // Start real-time tracking with Leaflet
    trackingInterval = setInterval(async () => {
        try {
            const { data: trackingData, error } = await supabase
                .from('shipment_tracking')
                .select('*')
                .eq('shipment_id', shipmentId)
                .order('timestamp', { ascending: false })
                .limit(1);

            if (error || !trackingData?.length) return;

            const latest = trackingData[0];
            const newPos = L.latLng(latest.latitude, latest.longitude);
            
            // Smooth marker movement
            truckMarker.setLatLng(newPos);
            
            // Update UI
            document.getElementById('currentSpeed').textContent = `${(latest.speed || 0).toFixed(0)} km/h`;
            
            // Auto-pan to keep truck in view
            if (!map.getBounds().contains(newPos)) {
                map.panTo(newPos);
            }
            
            // Calculate progress using Leaflet's distance calculation
            if (routePolyline) {
                const route = routePolyline.getLatLngs();
                const totalDistance = route[0].distanceTo(route[route.length - 1]);
                const traveledDistance = route[0].distanceTo(newPos);
                const progress = Math.min(traveledDistance / totalDistance, 1);
                
                document.getElementById('progressFill').style.width = `${progress * 100}%`;
                
                if (progress > 0.95) {
                    clearInterval(trackingInterval);
                    document.getElementById('trackingStatus').querySelector('span').textContent = 'Arrived';
                }
            }
        } catch (err) {
            console.error('Error in tracking:', err);
        }
    }, 3000);
}

async function geocodeAddress(address) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`);
        const data = await response.json();
        if (data && data.length > 0) {
            return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        }
    } catch (err) {
        console.error('Geocoding error:', err);
    }
    return [9.03, 38.74]; // Default to Addis Ababa
}

function resetUI() {
    document.getElementById('trackingDetails').innerHTML = `<p>Select a shipment to view tracking information</p>`;
    document.getElementById('driverName').textContent = '-';
    document.getElementById('driverPhone').textContent = '-';
    document.getElementById('vehicleInfo').textContent = '-';
    document.getElementById('trackingStatus').querySelector('span').textContent = 'Select a shipment';
    if (routePolyline) map.removeLayer(routePolyline);
    truckMarker.setLatLng([0, 0]);
}

/**
 * Helper function to get a point along a Leaflet polyline at a certain percentage.
 * This is a simplified interpolation for demonstration.
 */
function getPointAtDistance(polyline, fraction) {
    const latlngs = polyline.getLatLngs();
    if (fraction <= 0) return latlngs[0];
    if (fraction >= 1) return latlngs[latlngs.length - 1];

    const totalDist = latlngs.reduce((dist, curr, i, arr) => {
        if (i === 0) return 0;
        return dist + arr[i - 1].distanceTo(curr);
    }, 0);

    const targetDist = totalDist * fraction;
    let traveledDist = 0;

    for (let i = 0; i < latlngs.length - 1; i++) {
        const from = latlngs[i];
        const to = latlngs[i + 1];
        const segmentDist = from.distanceTo(to);

        if (traveledDist + segmentDist >= targetDist) {
            const segmentFraction = (targetDist - traveledDist) / segmentDist;
            const lat = from.lat + (to.lat - from.lat) * segmentFraction;
            const lng = from.lng + (to.lng - from.lng) * segmentFraction;
            return L.latLng(lat, lng);
        }
        traveledDist += segmentDist;
    }
    return latlngs[latlngs.length - 1];
}