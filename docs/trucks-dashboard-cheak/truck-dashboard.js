import { supabase, backendUrl, supabaseReady } from '../assets/supabaseClient.js';
import { locationTracker } from '../assets/locationTracker.js';
import { notificationManager } from '../assets/notifications.js';
import { initHamburgerMenu } from '../assets/hamburger-menu.js';

document.addEventListener('DOMContentLoaded', async () => {
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');
    const userAvatarEl = document.getElementById('userAvatar');
    const logoutBtn = document.getElementById('logoutBtn');
    const postsContainer = document.getElementById('postsContainer');
    const refreshBtn = document.getElementById('refreshPosts');
    const acceptedContainer = document.getElementById('acceptedContainer');

    // --- 1. Authentication Check ---
    await supabaseReady;

    // Check for existing session first
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        setupDashboard(session.user);
    } else {
        window.location.replace('../trucks-login/trucks-login.html');
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
            setupDashboard(session.user);
        } else {
            window.location.replace('../trucks-login/trucks-login.html');
        }
    });

    async function setupDashboard(user) {
        // Ensure user_role is correctly set for truck owners, especially after Google sign-up
        const userRole = user.user_metadata?.user_role;
        if (!userRole || !userRole.includes('truck')) {
             console.warn("User role is not 'truck_owner'. This may cause issues.", user);
             // Potentially redirect or log out if they don't belong here.
        }

        // Check if profile is completed by checking vehicles table
        try {
            const { data: vehicle, error } = await supabase
                .from('vehicles')
                .select('*')
                .eq('user_id', user.id)
                .single();
            
            if (error || !vehicle) {
                // No vehicle registered, redirect to complete profile
                window.location.replace('../trucks-register/complete-profile.html');
                return;
            }
        } catch (err) {
            console.error('Error checking vehicle:', err);
            // If error checking, redirect to complete profile to be safe
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
    notificationManager.init(user.id, 'truck_owner');
    
        // --- 5. Initialize Hamburger Menu ---
        const menuItems = [
            { href: 'truck-dashboard.html', icon: 'fas fa-chart-bar', title: 'Dashboard', desc: 'Overview', active: true },
            { href: '#bookings', icon: 'fas fa-calendar-alt', title: 'Bookings', desc: 'Manage bookings' },
            { href: '#my-trucks', icon: 'fas fa-truck', title: 'My Trucks', desc: 'Vehicle management' },
            { href: '#earnings', icon: 'fas fa-dollar-sign', title: 'Earnings', desc: 'Financial overview' },
            { href: '#schedule', icon: 'fas fa-clock', title: 'Schedule', desc: 'Delivery schedule' },
            { href: '#profile', icon: 'fas fa-user', title: 'Profile', desc: 'Account settings' }
        ];
        const menu = initHamburgerMenu(menuItems, { name: profileName, role: 'Truck Owner Portal' });
        menu.logoutBtn.addEventListener('click', async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Error logging out:', error);
                alert('Failed to log out.');
            }
            menu.close();
        });

        // --- 6. Event Listeners for All Buttons ---
        
        // Refresh button with visual feedback
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            
            await Promise.all([
                loadAvailableLoads(),
                loadAcceptedShipments(user),
                populateDashboardStats(user)
            ]);
            
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
        });
        
        // New Booking button
        const newBookingBtn = document.querySelector('.new-booking-btn');
        if (newBookingBtn) {
            newBookingBtn.addEventListener('click', () => {
                document.querySelector('.shipper-posts').scrollIntoView({ behavior: 'smooth' });
                loadAvailableLoads();
            });
        }
        
        // Stat cards - make clickable
        document.querySelectorAll('.stat-card').forEach((card, index) => {
            card.style.cursor = 'pointer';
            card.style.transition = 'transform 0.2s, box-shadow 0.2s';
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-5px)';
                card.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = '';
            });
            card.addEventListener('click', () => {
                if (index === 0) {
                    document.querySelector('.accepted-shipments').scrollIntoView({ behavior: 'smooth' });
                } else if (index === 1) {
                    document.querySelector('.shipper-posts').scrollIntoView({ behavior: 'smooth' });
                    loadAvailableLoads();
                } else if (index === 2) {
                    alert(`Total Earnings: ${card.querySelector('h3').textContent}\n\nDetailed earnings report coming soon!`);
                } else if (index === 3) {
                    alert(`Average Rating: ${card.querySelector('h3').textContent}\n\nView detailed ratings coming soon!`);
                }
            });
        });

        // Use event delegation for dynamically created buttons
        postsContainer.addEventListener('click', handleBidButtonClick);
        if (acceptedContainer) {
            acceptedContainer.addEventListener('click', (e) => {
                handlePickupShipment(e);
                handleStartShipment(e);
                handleDeliverShipment(e);
            });
        }

        // Final translation call after setup
        if (window.appTranslations && typeof window.appTranslations.translatePage === 'function') {
            window.appTranslations.translatePage(window.appTranslations.getLanguage());
        }

        // Re-apply translations after setup
        if (window.appTranslations && typeof window.appTranslations.translatePage === 'function') {
            window.appTranslations.translatePage(window.appTranslations.getLanguage());
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
        postsContainer.innerHTML = '<div class="loading" data-translate="loadingAvailableLoads">Loading available loads...</div>';

        try {
            const sessionResp = await supabase.auth.getSession();
            const session = sessionResp?.data?.session;
            if (!session) throw new Error('Not authenticated');

            // Don't filter by status - let backend handle it based on user role
            // Add timestamp to prevent caching
            const apiUrl = (backendUrl || '').replace(/\/$/, '') + '/shipments?t=' + Date.now();
            console.log('Fetching from:', apiUrl);
            console.log('Backend URL:', backendUrl);
            const response = await fetch(apiUrl, {
                headers: { Authorization: `Bearer ${session.access_token}` },
                cache: 'no-store'
            });
            console.log('Response status:', response.status);
            if (!response.ok) throw new Error(`Failed to fetch loads: ${response.status} ${response.statusText}`);
            const json = await response.json();
            const allShipments = json?.shipments || [];
            
            console.log('All shipments received:', allShipments.length);
            console.log('Shipments data:', allShipments);
            
            // Filter for pending shipments only (not yet accepted by any truck owner)
            const shipments = allShipments.filter(s => s.status === 'pending' && !s.truck_owner_id);
            
            console.log('Filtered pending shipments:', shipments.length);
            console.log('Pending shipments:', shipments);

            if (shipments.length === 0) {
                postsContainer.innerHTML = '<div class="loading" data-translate="noAvailableLoads">No available loads at the moment. Check back soon!</div>';
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
                        <span class="status-badge status-available" data-translate="statusAvailable">Available</span>
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
                        <button class="bid-btn" data-shipment-id="${shipment.id}" data-translate="placeBid">
                            <i class="fas fa-gavel"></i> Place Bid
                        </button>
                    </div>
                </div>
            `).join('');

            // Re-apply translations
            if (window.appTranslations && typeof window.appTranslations.translatePage === 'function') {
                window.appTranslations.translatePage(window.appTranslations.getLanguage());
            }
            // Re-apply translations
            if (window.appTranslations && typeof window.appTranslations.translatePage === 'function') {
                window.appTranslations.translatePage(window.appTranslations.getLanguage());
            }

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
        
        acceptedContainer.innerHTML = '<div class="loading" data-translate="loadingAcceptedShipments">Loading your accepted shipments...</div>';

        try {
            const sessionResp = await supabase.auth.getSession();
            const session = sessionResp?.data?.session;
            if (!session) throw new Error('Not authenticated');

            // Don't filter by status - get all shipments and filter client-side
            // Add timestamp to prevent caching
            const apiUrl = (backendUrl || '').replace(/\/$/, '') + '/shipments?t=' + Date.now();
            console.log('Fetching accepted shipments from:', apiUrl);
            const response = await fetch(apiUrl, {
                headers: { Authorization: `Bearer ${session.access_token}` },
                cache: 'no-store'
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
                    
                    console.log(`Checking shipment ${s.id}: owner=${shipmentOwnerStr}, user=${userIdStr}, status=${s.status}, match=${shipmentOwnerStr === userIdStr}`);
                    
                    if (!sid || !user?.id) return false;
                    // Exclude delivered and cancelled shipments
                    return shipmentOwnerStr === userIdStr && ['accepted','picked_up','in_transit'].includes(s.status);
                } catch (e) {
                    console.warn('Error while checking shipment ownership', e);
                    return false;
                }
            });
            console.log('Total shipments fetched:', shipments.length);
            console.log('My accepted shipments:', myShipments.length);
            console.log('My shipments data:', myShipments);

            if (myShipments.length === 0) {
                acceptedContainer.innerHTML = '<div class="loading" data-translate="noAcceptedShipments">No accepted shipments.</div>';
                return;
            }

            acceptedContainer.innerHTML = myShipments.map(shipment => {
                let actionButton = '';
                if (shipment.status === 'accepted') {
                    actionButton = `<button class="pickup-btn" data-shipment-id="${shipment.id}" data-translate="markAsPickedUp">
                        <i class="fas fa-box-open"></i> Mark as Picked Up
                    </button>`;
                } else if (shipment.status === 'picked_up') {
                    actionButton = `<button class="start-btn" data-shipment-id="${shipment.id}" data-translate="markAsInTransit">
                        <i class="fas fa-truck"></i> Mark as In Transit
                    </button>`;
                } else if (shipment.status === 'in_transit') {
                    actionButton = `<button class="deliver-btn" data-shipment-id="${shipment.id}" data-translate="markAsDelivered">
                        <i class="fas fa-check-circle"></i> Mark as Delivered
                    </button>`;
                }
                
                return `
                    <div class="post-card">
                        <div class="post-header">
                            <div>
                                <h3 class="post-title">${shipment.goods_description}</h3>
                                <div class="post-meta">
                                    <span><i class="fas fa-map-marker-alt"></i> ${shipment.origin_address} to ${shipment.destination_address}</span>
                                    <span><i class="fas fa-weight-hanging"></i> ${shipment.weight_kg} kg</span>
                                </div>
                            </div>
                            <span class="status-badge status-${shipment.status}" data-translate="${shipment.status}">${shipment.status.replace('_', ' ').toUpperCase()}</span>
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
                            ${actionButton}
                        </div>
                    </div>
                `;
            }).join('');

            // Re-apply translations
            if (window.appTranslations && typeof window.appTranslations.translatePage === 'function') {
                window.appTranslations.translatePage(window.appTranslations.getLanguage());
            }
            // Re-apply translations
            if (window.appTranslations && typeof window.appTranslations.translatePage === 'function') {
                window.appTranslations.translatePage(window.appTranslations.getLanguage());
            }

        } catch (err) {
            console.error('Error fetching accepted shipments:', err);
            acceptedContainer.innerHTML = '<div class="loading" style="color: var(--danger);">Failed to load accepted shipments.</div>';
        }
    }

    /**
     * Handle marking shipment as picked up
     */
    async function handlePickupShipment(event) {
        if (!event.target.matches('.pickup-btn, .pickup-btn *')) return;

        const button = event.target.closest('.pickup-btn');
        const shipmentId = button.dataset.shipmentId;

        if (!confirm('Have you picked up the items from the shipper?')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('shipments')
                .update({ status: 'picked_up' })
                .eq('id', shipmentId);

            if (error) throw error;
            
            alert('Shipment marked as picked up!');
            const { data: { user } } = await supabase.auth.getUser();
            loadAcceptedShipments(user);
        } catch (err) {
            console.error('Error marking as picked up:', err);
            alert(`Failed to mark as picked up: ${err.message}`);
        }
    }

    /**
     * Handle starting shipment (in transit)
     */
    async function handleStartShipment(event) {
        if (!event.target.matches('.start-btn, .start-btn *')) return;

        const button = event.target.closest('.start-btn');
        const shipmentId = button.dataset.shipmentId;

        if (!confirm('Are you on the way to deliver? This will begin live tracking.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('shipments')
                .update({ status: 'in_transit' })
                .eq('id', shipmentId);

            if (error) throw error;

            // Start location tracking
            if (window.locationTracker) {
                try {
                    await window.locationTracker.startTracking(shipmentId);
                    console.log('Location tracking started for shipment:', shipmentId);
                } catch (locErr) {
                    console.error('Location tracking error:', locErr);
                    alert('Warning: Location tracking could not start. Please enable location permissions.');
                }
            }
            
            alert('Shipment in transit! Live tracking is now active.');
            const { data: { user } } = await supabase.auth.getUser();
            await new Promise(resolve => setTimeout(resolve, 500));
            loadAcceptedShipments(user);
        } catch (err) {
            console.error('Error starting shipment:', err);
            alert(`Failed to start shipment: ${err.message}`);
        }
    }

    /**
     * Handle marking shipment as delivered
     */
    async function handleDeliverShipment(event) {
        if (!event.target.matches('.deliver-btn, .deliver-btn *')) return;

        const button = event.target.closest('.deliver-btn');
        const shipmentId = button.dataset.shipmentId;

        if (!confirm('Mark this shipment as delivered?')) {
            return;
        }

        try {
            const sessionResp = await supabase.auth.getSession();
            const session = sessionResp?.data?.session;
            if (!session) throw new Error('Not authenticated');

            // Use admin client via backend to update status
            const apiUrl = (backendUrl || '').replace(/\/$/, '') + `/shipments/${shipmentId}/deliver`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to mark as delivered');
            }

            // Stop location tracking
            if (window.locationTracker) {
                await window.locationTracker.stopTracking();
            }
            
            alert('Shipment marked as delivered!');
            const { data: { user } } = await supabase.auth.getUser();
            await new Promise(resolve => setTimeout(resolve, 500));
            loadAcceptedShipments(user);
            populateDashboardStats(user);
        } catch (err) {
            console.error('Error delivering shipment:', err);
            alert(`Failed to mark as delivered: ${err.message}`);
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
        
        // Prevent double-clicking
        if (button.disabled) return;

        if (!confirm('Are you sure you want to accept this load? This will assign it to you immediately.')) {
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('You must be logged in to place a bid.');
            return;
        }
        
        // Disable button and show loading state
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Accepting...';

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
            
            // Remove the card immediately from UI
            const card = button.closest('.post-card');
            if (card) card.remove();
            
            alert('Load accepted successfully! You can now start the shipment.');
            
            // Refresh in background
            const { data: { user: refreshedUser } } = await supabase.auth.getUser();
            await Promise.all([
                loadAcceptedShipments(refreshedUser || user),
                loadAvailableLoads(),
                populateDashboardStats(refreshedUser || user)
            ]);
        } catch (err) {
            console.error('Error accepting shipment:', err);
            if (err.message.includes('current status: accepted')) {
                alert('This shipment has already been accepted by another driver.');
                const card = button.closest('.post-card');
                if (card) card.remove();
            } else {
                alert(`Failed to accept the load: ${err.message}`);
                // Re-enable button on error
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-gavel"></i> Place Bid';
            }
        }
    }
});