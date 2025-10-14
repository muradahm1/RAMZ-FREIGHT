import { supabase } from '../assets/supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    const userProfile = document.querySelector('.user-profile');
    const userNameSpan = document.querySelector('.user-name');
    const userAvatar = document.querySelector('.user-avatar');
    const welcomeMessage = document.getElementById('welcome-message');

    // Check authentication
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
            .order('created_at', { ascending: false }) // Show newest first
            .limit(5); // Limit to the 5 most recent

        if (error) throw error;

        if (shipments.length === 0) {
            shipmentsList.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-box-open"></i>
                    <p>No active shipments. <a href="../create-shipment/create-shipment.html">Create one now!</a></p>
                </div>
            `;
        } else {
            shipmentsList.innerHTML = shipments.map(shipment => `
            <div class="shipment-card">
                <div class="shipment-info">
                    <h4>${shipment.goods_description}</h4>
                    <div class="shipment-details">
                        <span><i class="fas fa-map-marker-alt"></i> From: ${shipment.origin_address}</span>
                        <span><i class="fas fa-arrow-right"></i> To: ${shipment.destination_address}</span>
                    </div>
                </div>
                <div class="shipment-status status-${shipment.status.toLowerCase()}">${shipment.status}</div>
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

function loadAvailableTrucks() {
    const trucksGrid = document.getElementById('trucksGrid');
    const sampleTrucks = [
        { name: 'Fuso Canter', type: 'Box Truck', location: 'Bole, Addis Ababa', rating: 4.8 },
        { name: 'Sino Truck', type: 'Flatbed', location: 'Kality, Addis Ababa', rating: 4.9 },
        { name: 'Isuzu NPR', type: 'Refrigerated', location: 'Sarbet, Addis Ababa', rating: 4.7 }
    ];

    trucksGrid.innerHTML = sampleTrucks.map(truck => `
        <div class="truck-card">
            <div class="truck-header">
                <span class="truck-name">${truck.name}</span>
                <span class="truck-rating"><i class="fas fa-star"></i> ${truck.rating}</span>
            </div>
            <div class="truck-details">
                <div class="truck-detail"><i class="fas fa-truck"></i> ${truck.type}</div>
                <div class="truck-detail"><i class="fas fa-map-pin"></i> ${truck.location}</div>
            </div>
            <div class="truck-actions">
                <button class="btn-small btn-secondary">View Profile</button>
                <button class="btn-small btn-primary">Send Request</button>
            </div>
        </div>
    `).join('');
}