import { supabase } from '../assets/supabaseClient.js';
import { locationTracker } from '../assets/locationTracker.js';

document.addEventListener('DOMContentLoaded', () => {
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');
    const userAvatarEl = document.getElementById('userAvatar');
    const logoutBtn = document.getElementById('logoutBtn');
    const postsContainer = document.getElementById('postsContainer');
    const refreshBtn = document.getElementById('refreshPosts');
    const acceptedContainer = document.getElementById('acceptedContainer');

    // --- 1. Authentication Check ---
    supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            // User is logged in, setup the dashboard
            setupDashboard(session.user);
        } else {
            // User is not logged in, redirect to login
            window.location.replace('../trucks-login/trucks-login.html');
        }
    });

    function setupDashboard(user) {
        // --- 2. Populate User Info ---
        const profileName = user.user_metadata?.full_name || user.email.split('@')[0];
        userNameEl.textContent = profileName;
        userRoleEl.textContent = 'Truck Owner'; // Or from user_metadata if you store it
        userAvatarEl.src = user.user_metadata?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${profileName}`;

        // --- 3. Logout Functionality ---
        logoutBtn.addEventListener('click', async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Error logging out:', error);
                alert('Failed to log out.');
            }
            // The onAuthStateChange listener will handle the redirect.
        });

        // --- 4. Load Data ---
        loadAvailableLoads();
        loadAcceptedShipments(user);

        // --- 5. Event Listeners ---
        refreshBtn.addEventListener('click', () => {
            loadAvailableLoads();
            loadAcceptedShipments(user);
        });

        // Use event delegation for dynamically created buttons
        postsContainer.addEventListener('click', handleBidButtonClick);
        if (acceptedContainer) {
            acceptedContainer.addEventListener('click', handleStartShipment);
        }
    }

    /**
     * Fetches and renders available shipments from Supabase.
     */
    async function loadAvailableLoads() {
        postsContainer.innerHTML = '<div class="loading">Loading available loads...</div>';

        try {
            // Fetch shipments that are 'pending'
            const { data: shipments, error } = await supabase
                .from('shipments')
                .select('*')
                .eq('status', 'pending');

            if (error) {
                throw error;
            }

            if (shipments.length === 0) {
                postsContainer.innerHTML = '<div class="loading">No available loads at the moment. Check back soon!</div>';
                return;
            }

            postsContainer.innerHTML = shipments.map(shipment => `
                <div class="post-card">
                    <div class="post-header">
                        <div>
                            <h3 class="post-title">${shipment.goods_description}</h3>
                            <div class="post-meta">
                                <span><i class="fas fa-map-marker-alt"></i> ${shipment.origin_address} to ${shipment.destination_address}</span>
                                <span><i class="fas fa-weight-hanging"></i> ${shipment.weight_kg} kg</span>
                            </div>
                        </div>
                        <span class="status-badge status-available">Available</span>
                    </div>
                    <div class="post-details">
                        <div class="detail-item">
                            <i class="fas fa-box"></i>
                            <span>Goods Type: <strong>${shipment.goods_type}</strong></span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span>Pickup: <strong>${new Date(shipment.pickup_datetime).toLocaleString()}</strong></span>
                        </div>
                    </div>
                    <div class="bid-section">
                        <span class="bid-amount">$${(shipment.weight_kg * 0.5).toFixed(2)}</span>
                        <button class="bid-btn" data-shipment-id="${shipment.id}">
                            <i class="fas fa-gavel"></i> Place Bid
                        </button>
                    </div>
                </div>
            `).join('');

        } catch (err) {
            console.error('Error fetching shipments:', err);
            postsContainer.innerHTML = '<div class="loading" style="color: var(--danger);">Failed to load available loads. Please try again.</div>';
        }
    }

    /**
     * Load accepted shipments for the current truck owner
     */
    async function loadAcceptedShipments(user) {
        if (!acceptedContainer) return;
        
        acceptedContainer.innerHTML = '<div class="loading">Loading your accepted shipments...</div>';

        try {
            const { data: shipments, error } = await supabase
                .from('shipments')
                .select('*')
                .eq('truck_owner_id', user.id)
                .in('status', ['accepted', 'in_transit']);

            if (error) throw error;

            if (shipments.length === 0) {
                acceptedContainer.innerHTML = '<div class="loading">No accepted shipments.</div>';
                return;
            }

            acceptedContainer.innerHTML = shipments.map(shipment => `
                <div class="post-card">
                    <div class="post-header">
                        <div>
                            <h3 class="post-title">${shipment.goods_description}</h3>
                            <div class="post-meta">
                                <span><i class="fas fa-map-marker-alt"></i> ${shipment.origin_address} to ${shipment.destination_address}</span>
                                <span><i class="fas fa-weight-hanging"></i> ${shipment.weight_kg} kg</span>
                            </div>
                        </div>
                        <span class="status-badge status-${shipment.status}">${shipment.status.replace('_', ' ').toUpperCase()}</span>
                    </div>
                    <div class="post-details">
                        <div class="detail-item">
                            <i class="fas fa-box"></i>
                            <span>Goods Type: <strong>${shipment.goods_type}</strong></span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span>Pickup: <strong>${new Date(shipment.pickup_datetime).toLocaleString()}</strong></span>
                        </div>
                    </div>
                    <div class="bid-section">
                        ${shipment.status === 'accepted' ? 
                            `<button class="start-btn" data-shipment-id="${shipment.id}">
                                <i class="fas fa-play"></i> Start Shipment
                            </button>` :
                            `<button class="track-btn" onclick="window.open('../live-tracking/live-tracking.html', '_blank')">
                                <i class="fas fa-map-marked-alt"></i> View Tracking
                            </button>`
                        }
                    </div>
                </div>
            `).join('');

        } catch (err) {
            console.error('Error fetching accepted shipments:', err);
            acceptedContainer.innerHTML = '<div class="loading" style="color: var(--danger);">Failed to load accepted shipments.</div>';
        }
    }

    /**
     * Handle starting a shipment
     */
    async function handleStartShipment(event) {
        if (!event.target.matches('.start-btn, .start-btn *')) return;

        const button = event.target.closest('.start-btn');
        const shipmentId = button.dataset.shipmentId;

        if (!confirm('Are you ready to start this shipment? This will begin live tracking.')) {
            return;
        }

        try {
            // Update shipment status
            const { error } = await supabase
                .from('shipments')
                .update({ status: 'in_transit' })
                .eq('id', shipmentId);

            if (error) throw error;

            // Start location tracking
            await locationTracker.startTracking(shipmentId);
            
            alert('Shipment started! Live tracking is now active.');
            const { data: { user } } = await supabase.auth.getUser();
            loadAcceptedShipments(user);
        } catch (err) {
            console.error('Error starting shipment:', err);
            alert(`Failed to start shipment: ${err.message}`);
        }
    }

    /**
     * Handles clicks on the "Place Bid" button.
     */
    async function handleBidButtonClick(event) {
        if (!event.target.matches('.bid-btn, .bid-btn *')) {
            return; // Exit if the click wasn't on a bid button or its icon
        }

        const button = event.target.closest('.bid-btn');
        const shipmentId = button.dataset.shipmentId;

        if (!confirm('Are you sure you want to accept this load? This will assign it to you immediately.')) {
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('You must be logged in to place a bid.');
            return;
        }

        const { error } = await supabase
            .from('shipments')
            .update({ truck_owner_id: user.id, status: 'accepted' })
            .eq('id', shipmentId);

        if (error) {
            console.error('Error accepting shipment:', error);
            alert(`Failed to accept the load: ${error.message}`);
        } else {
            alert('Load accepted successfully! You can now start the shipment.');
            loadAvailableLoads(); // Refresh the list to remove the accepted load
            loadAcceptedShipments(user);
        }
    }
});