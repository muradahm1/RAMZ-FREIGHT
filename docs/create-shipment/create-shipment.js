import { supabase, supabaseReady, backendUrl } from '../assets/supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('createShipmentForm');
    const submitBtn = document.getElementById('submitBtn');

    // Wait for the Supabase client to be ready (handles CDN or module case)
    try {
        await supabaseReady;
    } catch (err) {
        console.error('Supabase failed to initialize:', err);
        alert('Authentication client failed to initialize. Please try again later.');
        return;
    }

    // Check session once and require login
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session || null;
    if (!session) {
        window.location.replace('../shippers-login/shippers-login.html');
        return;
    }

    // Set min date for pickup to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('pickupDate').setAttribute('min', today);

    // --- Form Submission Handler ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting Request...';

        const formData = new FormData(form);

        const shipmentData = {
            origin_address: formData.get('origin'),
            destination_address: formData.get('destination'),
            goods_description: formData.get('goodsDescription'),
            weight_kg: parseFloat(formData.get('weight')) || 0,
            goods_type: formData.get('goodsType'),
            pickup_datetime: `${formData.get('pickupDate')}T${formData.get('pickupTime')}`,
            special_instructions: formData.get('specialInstructions')
        };

        const access_token = session.access_token;

        // Build backend URL dynamically
        const apiUrl = (backendUrl || '').replace(/\/$/, '') + '/shipments';

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${access_token}`
                },
                body: JSON.stringify(shipmentData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to post shipment.');
            }

            alert('Shipment request posted successfully!');
            window.location.href = '../shippers-dashboard/shippers-dashboard.html';

        } catch (error) {
            console.error('Error creating shipment:', error);
            alert(`Error: ${error.message}`);
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Post Shipment Request';
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