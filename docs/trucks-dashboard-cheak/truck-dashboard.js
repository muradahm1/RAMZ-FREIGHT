import { supabase, backendUrl, supabaseReady } from '../assets/supabaseClient.js';
import { locationTracker } from '../assets/locationTracker.js';

document.addEventListener('DOMContentLoaded', async () => {
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');
    const userAvatarEl = document.getElementById('userAvatar');
    const logoutBtn = document.getElementById('logoutBtn');
    const postsContainer = document.getElementById('postsContainer');
    const refreshBtn = document.getElementById('refreshPosts');
    const acceptedContainer = document.getElementById('acceptedContainer');

    // --- 1. Authentication Check ---
    // Wait for Supabase to be ready
    await supabaseReady;
    
    // Check for existing session first
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        setupDashboard(session.user);
    } else {
        window.location.replace('../trucks-login/trucks-login.html');
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            setupDashboard(session.user);
        } else {
            window.location.replace('../trucks-login/trucks-login.html');
        }
    });

    async function setupDashboard(user) {
        // Check if profile is completed
        if (!user.user_metadata?.profile_completed && user.app_metadata?.provider !== 'google') {
            window.location.replace('../trucks-register/complete-profile.html');
            return;
        }

        // --- 2. Populate User Info ---
        const profileName = user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'Driver');
        userNameEl.textContent = profileName;
        userRoleEl.textContent = user.user_metadata?.role || 'Truck Owner'; // Use metadata role if available

        // Set avatar: prefer stored avatar_url, fall back to Dicebear initials
        const avatarUrl = user.user_metadata?.avatar_url;
        try {
            userAvatarEl.src = avatarUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(profileName)}`;
        } catch (e) {
            userAvatarEl.src = `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(profileName)}`;
        }

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
    populateDashboardStats(user);

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
     * Populate top-level dashboard statistics using backend data.
     */
    async function populateDashboardStats(user) {
        try {
            const sessionResp = await supabase.auth.getSession();
            const session = sessionResp?.data?.session;
            if (!session) return;

            // Fetch all shipments for this truck owner or overall for stats
            const apiUrl = (backendUrl || '').replace(/\/$/, '') + '/shipments';
            const response = await fetch(apiUrl, { headers: { Authorization: `Bearer ${session.access_token}` } });
            if (!response.ok) return;
            const json = await response.json();
            const shipments = json?.shipments || [];

            // Total bookings (for this owner)
            const myShipments = shipments.filter(s => s.truck_owner_id === user.id);
            document.getElementById('totalBookings').textContent = myShipments.length;

            // Pending requests (available loads not yet assigned)
            const pending = shipments.filter(s => s.status === 'pending');
            document.getElementById('pendingRequests').textContent = pending.length;

            // Simple earnings estimate: sum of assigned shipments' fee field if present
            const earnings = myShipments.reduce((sum, s) => sum + (parseFloat(s.fee) || 0), 0);
            document.getElementById('totalEarnings').textContent = `$${earnings.toFixed(2)}`;

            // Average rating placeholder: if you store ratings in shipment or separate table
            // fallback to dash default
            const avgRating = myShipments.length ? (myShipments.reduce((acc, s) => acc + (parseFloat(s.rating) || 0), 0) / myShipments.length) : 0;
            document.getElementById('avgRating').textContent = avgRating ? avgRating.toFixed(1) : '—';

        } catch (err) {
            console.warn('Could not populate dashboard stats:', err);
        }
    }

    /**
     * Fetches and renders available shipments by calling backend /shipments
     */
    async function loadAvailableLoads() {
        postsContainer.innerHTML = '<div class="loading">Loading available loads...</div>';

        try {
            const sessionResp = await supabase.auth.getSession();
            const session = sessionResp?.data?.session;
            if (!session) throw new Error('Not authenticated');

            const apiUrl = (backendUrl || '').replace(/\/$/, '') + '/shipments?status=pending';
            console.log('Fetching from:', apiUrl);
            console.log('Backend URL:', backendUrl);
            const response = await fetch(apiUrl, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            console.log('Response status:', response.status);
            if (!response.ok) throw new Error(`Failed to fetch loads: ${response.status} ${response.statusText}`);
            const json = await response.json();
            const shipments = json?.shipments || [];

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
            console.error('Error details:', err.message);
            postsContainer.innerHTML = `<div class="loading" style="color: var(--danger);">Failed to load available loads: ${err.message}<br>Backend: ${backendUrl}</div>`;
        }
    }

    /**
     * Load accepted shipments for the current truck owner (via backend)
     */
    async function loadAcceptedShipments(user) {
        if (!acceptedContainer) return;
        
        acceptedContainer.innerHTML = '<div class="loading">Loading your accepted shipments...</div>';

        try {
            const sessionResp = await supabase.auth.getSession();
            const session = sessionResp?.data?.session;
            if (!session) throw new Error('Not authenticated');

            // Don't filter by status - get all shipments and filter client-side
            const apiUrl = (backendUrl || '').replace(/\/$/, '') + '/shipments';
            console.log('Fetching accepted shipments from:', apiUrl);
            const response = await fetch(apiUrl, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch shipments');
            const json = await response.json();
            const shipments = json?.shipments || [];

            console.log('All shipments:', shipments);
            console.log('User ID:', user.id);

            // Helper to normalize possible shapes of truck owner identifier returned by the API
            function ownerIdOf(shipment) {
                if (!shipment) return null;
                const v = shipment.truck_owner_id || shipment.truck_owner || null;
                if (!v) return null;
                // handle cases where the owner field might be an object (e.g. expanded relation)
                if (typeof v === 'object') {
                    return (v.id || v.user_id || v.uuid || null);
                }
                return String(v);
            }

            const myShipments = shipments.filter(s => {
                try {
                    const sid = ownerIdOf(s);
                    const userIdStr = String(user.id).trim();
                    const shipmentOwnerStr = String(sid || '').trim();
                    
                    console.log('=== Checking Shipment ===');
                    console.log('Shipment ID:', s.id);
                    console.log('truck_owner_id (raw):', s.truck_owner_id);
                    console.log('Resolved Owner ID:', sid);
                    console.log('Current User ID:', user.id);
                    console.log('Status:', s.status);
                    console.log('Match?', shipmentOwnerStr === userIdStr, '&& Status OK?', ['accepted','in_transit'].includes(s.status));
                    console.log('========================');
                    
                    if (!sid || !user?.id) return false;
                    return shipmentOwnerStr === userIdStr && ['accepted','in_transit'].includes(s.status);
                } catch (e) {
                    console.warn('Error while checking shipment ownership', e);
                    return false;
                }
            });
            console.log('Total shipments fetched:', shipments.length);
            console.log('My accepted shipments:', myShipments.length);
            console.log('My shipments data:', myShipments);

            if (myShipments.length === 0) {
                acceptedContainer.innerHTML = '<div class="loading">No accepted shipments.</div>';
                return;
            }

            acceptedContainer.innerHTML = myShipments.map(shipment => `
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

        try {
            const apiUrl = (backendUrl || '').replace(/\/$/, '') + `/shipments/${shipmentId}/assign`;
            const sessionResp = await supabase.auth.getSession();
            const session = sessionResp?.data?.session;
            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to accept load');
            }
            alert('Load accepted successfully! You can now start the shipment.');
            // Wait a moment for database to update
            await new Promise(resolve => setTimeout(resolve, 500));
            // Refresh current user from Supabase to ensure id/state is current, then reload UI
            const { data: { user: refreshedUser } } = await supabase.auth.getUser();
            populateDashboardStats(refreshedUser || user);
            loadAvailableLoads();
            loadAcceptedShipments(refreshedUser || user);
        } catch (err) {
            console.error('Error accepting shipment:', err);
            alert(`Failed to accept the load: ${err.message}`);
        }
    }
});