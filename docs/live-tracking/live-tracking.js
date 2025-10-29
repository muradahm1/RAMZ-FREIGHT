import { supabase } from '../assets/supabaseClient.js';

let map;
let truckMarker;
let routePolyline;
let trackingInterval;
let realtimeChannel;

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

    // Check for shipment_id in URL and auto-load
    const urlParams = new URLSearchParams(window.location.search);
    const shipmentIdFromUrl = urlParams.get('shipment_id');

    if (shipmentIdFromUrl) {
        const shipmentSelect = document.getElementById('shipmentSelect');
        
        // Check if the option for the given shipment ID exists in the dropdown
        const optionExists = shipmentSelect.querySelector(`option[value="${shipmentIdFromUrl}"]`);
        if (optionExists) {
            shipmentSelect.value = shipmentIdFromUrl;
            loadShipmentTracking(); // Automatically load the tracking data
        } else {
            console.warn('Shipment ID from URL not found or not available for tracking.');
        }
    }
}

function initMap() {
    map = L.map('trackingMap').setView([9.02497, 38.74689], 7); // Center on Addis Ababa

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Custom animated truck icon
    const truckIcon = L.divIcon({
        html: '<div class="truck-marker"><i class="fas fa-truck" style="color: #ff6b35; font-size: 32px;"></i></div>',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        className: 'truck-icon-wrapper'
    });

    truckMarker = L.marker([0, 0], { icon: truckIcon }).addTo(map);
    truckMarker.bindPopup('<div id="truckPopup">Loading...</div>');
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
        
        // Get truck's current position
        let truckCurrentPos = originCoord;
        if (latestTracking?.length > 0) {
            truckCurrentPos = [latestTracking[0].latitude, latestTracking[0].longitude];
        }
        
        // Draw route line from pickup to destination
        if (routePolyline) map.removeLayer(routePolyline);
        routePolyline = L.polyline([originCoord, destCoord], { 
            color: '#ff6b35',
            weight: 4,
            opacity: 0.7,
            dashArray: '10, 10'
        }).addTo(map);
        
        // Add markers for pickup and destination
        L.marker(originCoord, {
            icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41]
            })
        }).addTo(map).bindPopup('Pickup Location');
        
        L.marker(destCoord, {
            icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41]
            })
        }).addTo(map).bindPopup('Destination');
        
        // Set truck position and calculate distances
        truckMarker.setLatLng(truckCurrentPos);
        
        // Calculate distances
        const distToPickup = L.latLng(truckCurrentPos).distanceTo(L.latLng(originCoord)) / 1000; // km
        const distToDestination = L.latLng(truckCurrentPos).distanceTo(L.latLng(destCoord)) / 1000; // km
        const totalRouteDistance = L.latLng(originCoord).distanceTo(L.latLng(destCoord)) / 1000; // km
        
        // Update tracking details with current location info
        document.getElementById('trackingDetails').innerHTML = `
            <p><strong>From:</strong> ${shipment.origin_address}</p>
            <p><strong>To:</strong> ${shipment.destination_address}</p>
            <p style="color: #ff6b35; margin-top: 10px;"><strong>Truck Location:</strong></p>
            <p>📍 Distance to Pickup: ${distToPickup.toFixed(1)} km</p>
            <p>📍 Distance to Destination: ${distToDestination.toFixed(1)} km</p>
        `;
        
        // Fit map to show truck, pickup, and destination
        const bounds = L.latLngBounds([truckCurrentPos, originCoord, destCoord]);
        map.fitBounds(bounds.pad(0.15));

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
    console.log('Start tracking clicked, shipmentId:', shipmentId);
    
    if (!shipmentId || shipmentId === '' || shipmentId === 'Choose a shipment to track') {
        alert('Please select a shipment first.');
        return;
    }

    // Check the status from the UI instead of re-fetching
    const statusElement = document.getElementById('trackingStatus');
    if (!statusElement || !statusElement.querySelector('span')) {
        alert('Please select a shipment from the dropdown first.');
        return;
    }
    const status = statusElement.querySelector('span').textContent.toLowerCase();
    if (status !== 'in_transit' && status !== 'accepted') {
        alert('This shipment is not ready for tracking. Tracking is only available for accepted or in-transit shipments.');
        return;
    }

    clearInterval(trackingInterval);
    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
    }

    // Subscribe to realtime updates
    realtimeChannel = supabase
        .channel(`tracking:${shipmentId}`)
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'shipment_tracking', filter: `shipment_id=eq.${shipmentId}` },
            (payload) => {
                console.log('Realtime tracking update:', payload.new);
                updateTruckPosition(payload.new);
            }
        )
        .subscribe();

    console.log('Realtime tracking started for shipment:', shipmentId);

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
            
            // Update speed
            const speedKmh = (latest.speed || 0) * 3.6;
            document.getElementById('currentSpeed').textContent = `${speedKmh.toFixed(0)} km/h`;
            
            // Calculate current distances from truck position
            const { data: currentShipment } = await supabase
                .from('shipments')
                .select('origin_address, destination_address, status')
                .eq('id', shipmentId)
                .single();
            
            const pickupCoord = await geocodeAddress(currentShipment.origin_address);
            const destCoord = await geocodeAddress(currentShipment.destination_address);
            
            const distToPickup = newPos.distanceTo(L.latLng(pickupCoord)) / 1000;
            const distToDest = newPos.distanceTo(L.latLng(destCoord)) / 1000;
            
            // Determine truck status
            let truckStatus = 'En route to pickup';
            if (currentShipment.status === 'in_transit') {
                truckStatus = 'En route to destination';
            } else if (distToPickup < 0.5) {
                truckStatus = 'Near pickup location';
            }
            
            // Update truck popup with current location details
            const timestamp = new Date(latest.timestamp).toLocaleString();
            truckMarker.getPopup().setContent(`
                <div style="min-width: 220px;">
                    <h4 style="margin: 0 0 10px 0; color: #ff6b35;"><i class="fas fa-truck"></i> Truck Current Location</h4>
                    <p style="margin: 5px 0;"><strong>Status:</strong> ${truckStatus}</p>
                    <p style="margin: 5px 0;"><strong>Speed:</strong> ${speedKmh.toFixed(0)} km/h</p>
                    <p style="margin: 5px 0;"><strong>To Pickup:</strong> ${distToPickup.toFixed(1)} km</p>
                    <p style="margin: 5px 0;"><strong>To Destination:</strong> ${distToDest.toFixed(1)} km</p>
                    <p style="margin: 5px 0; font-size: 0.85em; color: #888;"><strong>Last Update:</strong> ${timestamp}</p>
                </div>
            `);
            
            // Update tracking details panel
            document.getElementById('trackingDetails').innerHTML = `
                <p><strong>From:</strong> ${currentShipment.origin_address}</p>
                <p><strong>To:</strong> ${currentShipment.destination_address}</p>
                <p style="color: #ff6b35; margin-top: 10px;"><strong>Truck Location:</strong></p>
                <p>📍 Distance to Pickup: ${distToPickup.toFixed(1)} km</p>
                <p>📍 Distance to Destination: ${distToDest.toFixed(1)} km</p>
            `
            
            // Auto-pan to keep truck in view
            if (!map.getBounds().contains(newPos)) {
                map.panTo(newPos);
            }
            
            // Calculate progress and distances
            if (routePolyline) {
                const route = routePolyline.getLatLngs();
                const origin = route[0];
                const destination = route[route.length - 1];
                
                const totalDistance = origin.distanceTo(destination) / 1000; // km
                const traveledDistance = origin.distanceTo(newPos) / 1000; // km
                const remainingDistance = newPos.distanceTo(destination) / 1000; // km
                
                const progress = Math.min(traveledDistance / totalDistance, 1);
                
                // Update progress bar
                document.getElementById('progressFill').style.width = `${progress * 100}%`;
                
                // Update distance traveled
                const distTraveledEl = document.getElementById('distanceTraveled');
                if (distTraveledEl) {
                    distTraveledEl.textContent = `${traveledDistance.toFixed(1)} km`;
                }
                
                // Calculate ETA
                if (speedKmh > 0) {
                    const hoursRemaining = remainingDistance / speedKmh;
                    const minutesRemaining = Math.round(hoursRemaining * 60);
                    const etaEl = document.getElementById('estimatedArrival');
                    if (etaEl) {
                        if (minutesRemaining < 60) {
                            etaEl.textContent = `${minutesRemaining} min`;
                        } else {
                            const hours = Math.floor(minutesRemaining / 60);
                            const mins = minutesRemaining % 60;
                            etaEl.textContent = `${hours}h ${mins}m`;
                        }
                    }
                }
                
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

async function updateTruckPosition(trackingData) {
    const newPos = L.latLng(trackingData.latitude, trackingData.longitude);
    truckMarker.setLatLng(newPos);
    
    const speedKmh = (trackingData.speed || 0) * 3.6;
    document.getElementById('currentSpeed').textContent = `${speedKmh.toFixed(0)} km/h`;
    
    const shipmentId = document.getElementById('shipmentSelect').value;
    const { data: currentShipment } = await supabase
        .from('shipments')
        .select('origin_address, destination_address, status')
        .eq('id', shipmentId)
        .single();
    
    const pickupCoord = await geocodeAddress(currentShipment.origin_address);
    const destCoord = await geocodeAddress(currentShipment.destination_address);
    
    const distToPickup = newPos.distanceTo(L.latLng(pickupCoord)) / 1000;
    const distToDest = newPos.distanceTo(L.latLng(destCoord)) / 1000;
    
    let truckStatus = 'En route to pickup';
    if (currentShipment.status === 'in_transit') {
        truckStatus = 'En route to destination';
    } else if (distToPickup < 0.5) {
        truckStatus = 'Near pickup location';
    }
    
    const timestamp = new Date(trackingData.timestamp).toLocaleString();
    truckMarker.getPopup().setContent(`
        <div style="min-width: 220px;">
            <h4 style="margin: 0 0 10px 0; color: #ff6b35;"><i class="fas fa-truck"></i> Truck Current Location</h4>
            <p style="margin: 5px 0;"><strong>Status:</strong> ${truckStatus}</p>
            <p style="margin: 5px 0;"><strong>Speed:</strong> ${speedKmh.toFixed(0)} km/h</p>
            <p style="margin: 5px 0;"><strong>To Pickup:</strong> ${distToPickup.toFixed(1)} km</p>
            <p style="margin: 5px 0;"><strong>To Destination:</strong> ${distToDest.toFixed(1)} km</p>
            <p style="margin: 5px 0; font-size: 0.85em; color: #888;"><strong>Last Update:</strong> ${timestamp}</p>
        </div>
    `);
    
    document.getElementById('trackingDetails').innerHTML = `
        <p><strong>From:</strong> ${currentShipment.origin_address}</p>
        <p><strong>To:</strong> ${currentShipment.destination_address}</p>
        <p style="color: #ff6b35; margin-top: 10px;"><strong>Truck Location:</strong></p>
        <p>📍 Distance to Pickup: ${distToPickup.toFixed(1)} km</p>
        <p>📍 Distance to Destination: ${distToDest.toFixed(1)} km</p>
    `;
    
    if (!map.getBounds().contains(newPos)) {
        map.panTo(newPos);
    }
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