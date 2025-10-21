import { supabase, supabaseReady } from '../assets/supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    const userProfile = document.querySelector('.user-profile');
    const userNameSpan = document.querySelector('.user-name');
    const userAvatar = document.querySelector('.user-avatar');
    const welcomeMessage = document.getElementById('welcome-message');

    // Wait for Supabase to be ready
    await supabaseReady;
    
    // Check for existing session first
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        if (session.user.app_metadata.provider === 'google') {
            await createShipperProfile(session.user);
        }
        setupDashboard(session.user);
    } else {
        window.location.replace('../shippers-login/shippers-login.html');
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user.app_metadata.provider === 'google') {
            await createShipperProfile(session.user);
        }
        if (session) {
            setupDashboard(session.user);
        } else {
            window.location.replace('../shippers-login/shippers-login.html');
        }
    });
    
    async function createShipperProfile(user) {
        try {
            const { data: existingProfile } = await supabase
                .from('shippers')
                .select('id')
                .eq('user_id', user.id)
                .single();
            
            if (!existingProfile) {
                await supabase.from('shippers').insert({
                    user_id: user.id,
                    full_name: user.user_metadata.full_name || user.email.split('@')[0],
                    phone: user.user_metadata.phone || null
                });
            }
        } catch (error) {
            console.error('Error with shipper profile:', error);
        }
    }

    function setupDashboard(user) {
        // --- 2. Populate User Info ---
        // Use email as name if no metadata is set
        const profileName = user.user_metadata?.full_name || user.email.split('@')[0];
        userNameSpan.textContent = profileName;
        welcomeMessage.textContent = `Welcome back, ${profileName}! 👋`;

        // Use a default avatar or one from metadata if available
        userAvatar.src = user.user_metadata?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${profileName}`;

        // --- 3. Logout Functionality ---
        userProfile.addEventListener('click', async () => {
            if (confirm('Are you sure you want to log out?')) {
                await supabase.auth.signOut();
            }
        });

        // --- 4. Load Dynamic Content ---
        loadActiveShipments(user);
        loadRecentActivity();
        loadAvailableTrucks();
    }
});


async function loadActiveShipments(user) {
    const shipmentsList = document.getElementById('shipmentsList');
    shipmentsList.innerHTML = '<div class="no-data"><p>Loading your shipments...</p></div>';

    try {
        const { data: shipments, error } = await supabase
            .from('shipments')
            .select('*')
            .eq('shipper_id', user.id)
            .in('status', ['pending', 'accepted', 'in_transit'])
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;

        if (shipments.length === 0) {
            shipmentsList.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-box-open" style="font-size: 3rem; color: var(--text-lighter); margin-bottom: 1rem;"></i>
                    <p>No active shipments. <a href="../create-shipment/create-shipment.html" style="color: var(--primary);">Create one now!</a></p>
                </div>
            `;
        } else {
            shipmentsList.innerHTML = shipments.map(shipment => `
            <div class="shipment-card">
                <div class="shipment-info">
                    <h4>${shipment.goods_description || 'Shipment'}</h4>
                    <div class="shipment-details">
                        <span><i class="fas fa-map-marker-alt"></i> ${shipment.origin_address}</span>
                        <span><i class="fas fa-arrow-right"></i> ${shipment.destination_address}</span>
                        <span><i class="fas fa-weight"></i> ${shipment.weight_kg || 0} kg</span>
                    </div>
                </div>
                <div class="shipment-status status-${shipment.status.toLowerCase()}">${shipment.status.toUpperCase()}</div>
            </div>
        `).join('');
        }
    } catch (err) {
        console.error("Error loading shipments:", err);
        shipmentsList.innerHTML = '<div class="no-data" style="color: var(--danger);">Failed to load shipments.</div>';
    }
}

function loadRecentActivity() {
    const activityList = document.getElementById('activityList');
    const sampleActivities = [
        { icon: 'fa-check-circle', iconClass: 'success', text: 'Shipment SHP-84518 was delivered.', time: '2 hours ago' },
        { icon: 'fa-plus-circle', iconClass: 'info', text: 'New shipment SHP-84521 created.', time: '5 hours ago' },
        { icon: 'fa-gavel', iconClass: 'warning', text: 'You received a new bid for SHP-84520.', time: '1 day ago' }
    ];

    activityList.innerHTML = sampleActivities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon ${activity.type}">
                <i class="${activity.icon}"></i>
            </div>
            <div class="activity-content">
                <p>${activity.text}</p>
                <span class="activity-time">${activity.time}</span>
            </div>
        </div>
    `).join('');
}

async function loadAvailableTrucks() {
    const trucksGrid = document.getElementById('trucksGrid');
    trucksGrid.innerHTML = '<div class="no-data"><p>Loading available trucks...</p></div>';

    try {
        const { data: vehicles, error } = await supabase
            .from('vehicles')
            .select('*')
            .eq('status', 'approved')
            .limit(6);

        if (error) throw error;

        if (!vehicles || vehicles.length === 0) {
            trucksGrid.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-truck" style="font-size: 3rem; color: var(--text-lighter); margin-bottom: 1rem;"></i>
                    <p>No trucks available at the moment.</p>
                </div>
            `;
            return;
        }

        trucksGrid.innerHTML = vehicles.map(truck => `
            <div class="truck-card">
                <div class="truck-header">
                    <span class="truck-name">${truck.vehicle_model || 'Truck'}</span>
                    <span class="truck-rating"><i class="fas fa-star"></i> 4.5</span>
                </div>
                <div class="truck-details">
                    <div class="truck-detail"><i class="fas fa-truck"></i> ${truck.vehicle_type}</div>
                    <div class="truck-detail"><i class="fas fa-weight"></i> ${truck.max_load_capacity} kg</div>
                    <div class="truck-detail"><i class="fas fa-id-card"></i> ${truck.license_plate}</div>
                </div>
                <div class="truck-actions">
                    <button class="btn-small btn-primary" onclick="alert('Contact feature coming soon!')">
                        <i class="fas fa-phone"></i> Contact
                    </button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error loading trucks:', err);
        trucksGrid.innerHTML = '<div class="no-data" style="color: var(--danger);">Failed to load trucks.</div>';
    }
}