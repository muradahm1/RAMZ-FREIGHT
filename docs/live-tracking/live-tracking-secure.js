import { supabase } from '../assets/supabaseClient.js';

let map, truckMarker, routePolyline, realtimeChannel;
let cachedShipmentData = null;

document.addEventListener('DOMContentLoaded', async () => {
    supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            initializeTrackingPage(session.user);
        } else {
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

function startRealTimeTracking() {
    console.log('Start tracking clicked');
    console.log('Cached shipment data:', cachedShipmentData);
    
    if (!cachedShipmentData || !cachedShipmentData.shipment || !cachedShipmentData.shipment.id) {
        alert('Please select a shipment from the dropdown first.');
        return;
    }

    const shipmentId = cachedShipmentData.shipment.id;
    const status = cachedShipmentData.shipment.status;
    
    console.log('Shipment ID:', shipmentId, 'Status:', status);

    if (status !== 'in_transit' && status !== 'picked_up' && status !== 'accepted') {
        alert('This shipment is not ready for live tracking yet.');
        return;
    }

    // Start the real-time subscription
    setupRealtimeTracking(shipmentId);
    alert('Real-time tracking is active! Updates will appear automatically.');
}

function initMap() {
    if (map) {
        map.remove();
    }
    map = L.map('trackingMap').setView([9.02497, 38.74689], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const truckIcon = L.divIcon({
        html: '<div class="truck-marker"><i class="fas fa-truck" style="color: #ff6b35; font-size: 32px;"></i></div>',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        className: 'truck-icon-wrapper'
    });

    truckMarker = L.marker([0, 0], { icon: truckIcon }).addTo(map);
    truckMarker.bindPopup('Loading...');
}

async function loadShipments(currentUser) {
    const shipmentSelect = document.getElementById('shipmentSelect');
    shipmentSelect.innerHTML = '<option value="">Loading...</option>';
    
    try {
        const { data: shipments, error } = await supabase
            .from('shipments')
            .select('*')
            .eq('shipper_id', currentUser.id)
            .in('status', ['accepted', 'in_transit', 'picked_up']);

        if (error) throw error;

        if (!shipments || shipments.length === 0) {
            shipmentSelect.innerHTML = '<option value="">No active shipments</option>';
            return;
        }

        shipmentSelect.innerHTML = '<option value="">Choose a shipment to track</option>';
        shipments.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = `${sanitizeHTML(s.goods_description)} - To: ${sanitizeHTML(s.destination_address)} (${sanitizeHTML(s.status)})`;
            shipmentSelect.appendChild(opt);
        });
    } catch (err) {
        console.error('Error loading shipments:', err);
        shipmentSelect.innerHTML = '<option value="">Error loading shipments</option>';
    }
}

async function loadShipmentTracking() {
    if (realtimeChannel) supabase.removeChannel(realtimeChannel);

    const shipmentId = document.getElementById('shipmentSelect').value;
    console.log('Loading shipment tracking for ID:', shipmentId);
    
    if (!shipmentId || shipmentId === '') {
        cachedShipmentData = null;
        resetUI();
        return;
    }

    try {
        const { data: shipment, error } = await supabase
            .from('shipments')
            .select('*')
            .eq('id', shipmentId)
            .single();

        if (error) throw error;
        if (!shipment) {
            alert('Shipment not found');
            return;
        }

        // Fetch vehicle info (truck owner info is in auth.users, not accessible via client)
        let truckOwner = {
            full_name: 'Driver',
            phone: 'Contact via app',
            avatar_url: null
        };
        let vehicle = null;

        if (shipment.truck_owner_id) {
            // Try to get vehicle info for this truck owner
            const { data: vehicleData } = await supabase
                .from('vehicles')
                .select('vehicle_type, license_plate, vehicle_model')
                .eq('user_id', shipment.truck_owner_id)
                .single();
            
            if (vehicleData) {
                vehicle = {
                    vehicle_model: vehicleData.vehicle_model || vehicleData.vehicle_type,
                    license_plate: vehicleData.license_plate
                };
            }
        }



        shipment.truck_owner = truckOwner;
        shipment.vehicle = vehicle;

        const originCoord = await geocodeAddress(shipment.origin_address);
        const destCoord = await geocodeAddress(shipment.destination_address);

        cachedShipmentData = { shipment, originCoord, destCoord };
        console.log('Shipment data cached:', cachedShipmentData);

        document.getElementById('driverName').textContent = sanitizeHTML(shipment.truck_owner?.full_name || 'N/A');
        document.getElementById('driverPhone').textContent = sanitizeHTML(shipment.truck_owner?.phone || 'N/A');
        document.getElementById('vehicleInfo').textContent = shipment.vehicle ? sanitizeHTML(`${shipment.vehicle.vehicle_model} (${shipment.vehicle.license_plate})`) : 'N/A';
        document.getElementById('driverPhoto').src = shipment.truck_owner?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(shipment.truck_owner?.full_name || 'D')}`;

        const { data: latestTracking } = await supabase
            .from('shipment_tracking')
            .select('*')
            .eq('shipment_id', shipmentId)
            .order('timestamp', { ascending: false })
            .limit(1);

        let truckPos = originCoord;
        if (latestTracking?.length > 0) {
            truckPos = [latestTracking[0].latitude, latestTracking[0].longitude];
        }

        await drawRoadRoute(originCoord, destCoord);

        L.marker(originCoord, { icon: L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', iconSize: [25, 41], iconAnchor: [12, 41] }) }).addTo(map).bindPopup('Pickup');
        L.marker(destCoord, { icon: L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', iconSize: [25, 41], iconAnchor: [12, 41] }) }).addTo(map).bindPopup('Destination');

        truckMarker.setLatLng(truckPos);
        map.fitBounds(L.latLngBounds([truckPos, originCoord, destCoord]).pad(0.15));

        updateTrackingUI(truckPos);

        document.getElementById('trackingStatus').querySelector('span').textContent = shipment.status;

    } catch (err) {
        console.error(err);
    }
}

async function drawRoadRoute(origin, dest) {
    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${origin[1]},${origin[0]};${dest[1]},${dest[0]}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();

        if (routePolyline) map.removeLayer(routePolyline);

        if (data.routes?.[0]) {
            const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
            routePolyline = L.polyline(coords, { color: '#ff6b35', weight: 4, opacity: 0.7 }).addTo(map);
        } else {
            routePolyline = L.polyline([origin, dest], { color: '#ff6b35', weight: 4, opacity: 0.7, dashArray: '10, 10' }).addTo(map);
        }
    } catch {
        routePolyline = L.polyline([origin, dest], { color: '#ff6b35', weight: 4, opacity: 0.7, dashArray: '10, 10' }).addTo(map);
    }
}

function setupRealtimeTracking(shipmentId) {
    // If a channel already exists for a different shipment, remove it first.
    if (realtimeChannel) supabase.removeChannel(realtimeChannel);

    realtimeChannel = supabase
        .channel(`tracking:${shipmentId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'shipment_tracking', filter: `shipment_id=eq.${shipmentId}` }, (payload) => {
            updateTruckPosition(payload.new);
        })
        .subscribe();
}

function updateTruckPosition(trackingData) {
    if (!cachedShipmentData) return;

    const newPos = L.latLng(trackingData.latitude, trackingData.longitude);
    truckMarker.setLatLng(newPos);

    const speedKmh = (trackingData.speed || 0) * 3.6;
    document.getElementById('currentSpeed').textContent = `${speedKmh.toFixed(0)} km/h`;

    updateTrackingUI(newPos);

    if (!map.getBounds().contains(newPos)) map.panTo(newPos);
}

function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function updateTrackingUI(truckPos) {
    const distToPickup = L.latLng(truckPos).distanceTo(L.latLng(cachedShipmentData.originCoord)) / 1000;
    const distToDest = L.latLng(truckPos).distanceTo(L.latLng(cachedShipmentData.destCoord)) / 1000;

    const trackingDetails = document.getElementById('trackingDetails');
    trackingDetails.innerHTML = '';
    
    const fromP = document.createElement('p');
    fromP.innerHTML = '<strong>From:</strong> ' + sanitizeHTML(cachedShipmentData.shipment.origin_address);
    trackingDetails.appendChild(fromP);
    
    const toP = document.createElement('p');
    toP.innerHTML = '<strong>To:</strong> ' + sanitizeHTML(cachedShipmentData.shipment.destination_address);
    trackingDetails.appendChild(toP);
    
    const locationP = document.createElement('p');
    locationP.style.color = '#ff6b35';
    locationP.style.marginTop = '10px';
    locationP.innerHTML = '<strong>Truck Location:</strong>';
    trackingDetails.appendChild(locationP);
    
    const pickupP = document.createElement('p');
    pickupP.textContent = `📍 Distance to Pickup: ${distToPickup.toFixed(1)} km`;
    trackingDetails.appendChild(pickupP);
    
    const destP = document.createElement('p');
    destP.textContent = `📍 Distance to Destination: ${distToDest.toFixed(1)} km`;
    trackingDetails.appendChild(destP);

    truckMarker.getPopup().setContent(`
        <div style="min-width: 220px;">
            <h4 style="margin: 0 0 10px 0; color: #ff6b35;"><i class="fas fa-truck"></i> Truck Location</h4>
            <p style="margin: 5px 0;"><strong>To Pickup:</strong> ${distToPickup.toFixed(1)} km</p>
            <p style="margin: 5px 0;"><strong>To Destination:</strong> ${distToDest.toFixed(1)} km</p>
        </div>
    `);
}

async function geocodeAddress(address) {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`);
        const data = await res.json();
        if (data && data.length > 0) {
            return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        }
    } catch (err) {
        console.error('Geocoding error:', err);
    }
    return [9.03, 38.74]; // Default to Addis Ababa
}

function resetUI() {
    cachedShipmentData = null;
    document.getElementById('trackingDetails').innerHTML = '<p>Select a shipment to view tracking information</p>';
    document.getElementById('driverName').textContent = 'Select a shipment to view driver details';
    document.getElementById('driverPhone').textContent = '-';
    document.getElementById('vehicleInfo').textContent = '-';
    document.getElementById('trackingStatus').querySelector('span').textContent = 'Select a shipment';
    if (routePolyline) map.removeLayer(routePolyline);
    truckMarker.setLatLng([0, 0]);
}
