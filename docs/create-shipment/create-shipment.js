import { supabase, supabaseReady, backendUrl } from '../assets/supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('createShipmentForm');
    const submitBtn = document.getElementById('submitBtn');
    let map = null;
    let marker = null;
    let pickingFor = null;

    // Wait for the Supabase client to be ready (handles CDN or module case)
    try {
        await supabaseReady;
    } catch (err) {
        console.error('Supabase failed to initialize:', err);
        alert('Authentication client failed to initialize. Please try again later.');
        return;
    }

    // Fast session check with cache
    let session = null;
    const cachedSession = localStorage.getItem('fast_session_cache');
    if (cachedSession) {
        try {
            const parsed = JSON.parse(cachedSession);
            if (parsed.expires_at > Date.now()) {
                session = parsed.session;
            }
        } catch (e) {}
    }
    
    if (!session) {
        const { data: sessionData } = await supabase.auth.getSession();
        session = sessionData?.session || null;
        if (session) {
            localStorage.setItem('fast_session_cache', JSON.stringify({
                session,
                expires_at: Date.now() + 300000 // 5 min cache
            }));
        }
    }
    
    if (!session) {
        window.location.replace('../shippers-login/shippers-login.html');
        return;
    }

    // Set min date for pickup to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('pickupDate').setAttribute('min', today);
    
    // Map picker buttons
    document.getElementById('pickOriginBtn').addEventListener('click', () => showMap('origin'));
    document.getElementById('pickDestinationBtn').addEventListener('click', () => showMap('destination'));
    
    function showMap(type) {
        pickingFor = type;
        const mapContainer = document.getElementById('mapContainer');
        mapContainer.style.display = 'block';
        
        if (!map) {
            map = L.map('mapContainer').setView([9.03, 38.74], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
            
            map.on('click', (e) => {
                if (marker) map.removeLayer(marker);
                marker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(map);
                
                fetch(`https://nominatim.openstreetmap.org/reverse?lat=${e.latlng.lat}&lon=${e.latlng.lng}&format=json`)
                    .then(r => r.json())
                    .then(data => {
                        const address = data.display_name;
                        if (pickingFor === 'origin') {
                            document.getElementById('origin').value = address;
                        } else {
                            document.getElementById('destination').value = address;
                        }
                        mapContainer.style.display = 'none';
                    });
            });
        }
        setTimeout(() => map.invalidateSize(), 100);
    }

    // --- Form Submission Handler ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting Request...';
        form.style.pointerEvents = 'none';

        const formData = new FormData(form);

        const shipmentData = {
            origin_address: formData.get('origin'),
            destination_address: formData.get('destination'),
            goods_description: formData.get('goodsDescription'),
            weight_kg: parseFloat(formData.get('weight')) || 0,
            goods_type: formData.get('goodsType'),
            pickup_datetime: `${formData.get('pickupDate')}T${formData.get('pickupTime')}`,
            special_instructions: formData.get('specialInstructions'),
            payment_amount: parseFloat(formData.get('paymentAmount')) || 0
        };

        try {
            // Direct Supabase insert - much faster
            const { data: result, error } = await supabase
                .from('shipments')
                .insert({
                    ...shipmentData,
                    shipper_id: session.user.id,
                    status: 'pending'
                })
                .select()
                .single();

            if (error) {
                throw new Error(error.message || 'Failed to post shipment.');
            }

            // Trigger notification
            if (window.notificationSystem) {
                window.notificationSystem.newShipment({
                    id: result.id,
                    origin: shipmentData.origin_address,
                    destination: shipmentData.destination_address
                });
            }
            
            alert('Shipment request posted successfully!');
            setTimeout(() => {
                window.location.href = '../shippers-dashboard/shippers-dashboard.html';
            }, 1000);

        } catch (error) {
            console.error('Error creating shipment:', error);
            
            alert(`Error: ${error.message}`);
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Post Shipment Request';
            form.style.pointerEvents = '';
        }
    });
});

/**
 * Supabase Table `shipments` Schema Suggestion:
 * 
 * id: uuid (Primary Key, default: uuid_generate_v4())
 * created_at: timestamp with time zone (default: now())
 * shipper_id: uuid (Foreign Key to auth.users.id)
 * origin_address: text
 * destination_address: text
 * goods_description: text
 * weight_kg: numeric
 * goods_type: text
 * pickup_datetime: timestamp with time zone
 * special_instructions: text
 * status: text (e.g., 'pending', 'in-transit', 'delivered')
 * truck_owner_id: uuid (nullable, Foreign Key to auth.users.id)
 */