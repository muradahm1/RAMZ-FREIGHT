import { supabase } from '../assets/supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('createShipmentForm');
    const submitBtn = document.getElementById('submitBtn');

    // --- 1. Authentication Check ---
    supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            // User is logged in, setup the form
            setupForm(session); // Pass the whole session object
        } else {
            // User is not logged in, redirect to login
            window.location.replace('../shippers-login/shippers-login.html');
        }
    });

    function setupForm(session) {
        // Set min date for pickup to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('pickupDate').setAttribute('min', today);

        // --- 2. Form Submission Handler ---
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting Request...';

            const formData = new FormData(form);
            
            // Data for the backend API - no shipper_id or status needed here
            const shipmentData = {
                origin_address: formData.get('origin'),
                destination_address: formData.get('destination'),
                goods_description: formData.get('goodsDescription'),
                weight_kg: parseFloat(formData.get('weight')),
                goods_type: formData.get('goodsType'),
                pickup_datetime: `${formData.get('pickupDate')}T${formData.get('pickupTime')}`,
                special_instructions: formData.get('specialInstructions')
            };

            const { access_token } = session;

            // --- 3. Send to Backend API ---
            try {
                const response = await fetch('http://localhost:4000/shipments', {
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
    }
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