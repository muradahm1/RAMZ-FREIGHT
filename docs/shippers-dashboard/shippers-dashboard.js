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
        loadStats(user);
        loadActiveShipments(user);
        loadRecentActivity(user);
        loadAvailableTrucks();
        loadNotifications(user);
    }

    async function loadNotifications(user) {
        try {
            const { data: notifications, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .eq('read', false)
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) throw error;

            if (notifications && notifications.length > 0) {
                notifications.forEach(notif => {
                    showNotification(notif.title, notif.message, notif.type, notif.id);
                });
            }
        } catch (err) {
            console.error('Error loading notifications:', err);
        }
    }

    function showNotification(title, message, type = 'info', notifId) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <strong>${title}</strong>
            <p>${message}</p>
        `;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            max-width: 350px;
            z-index: 9999;
            border-left: 4px solid ${type === 'success' ? '#4CAF50' : '#2196F3'};
        `;
        document.body.appendChild(notification);
        
        // Mark as read after showing
        if (notifId) {
            supabase.from('notifications').update({ read: true }).eq('id', notifId).then();
        }
        
        setTimeout(() => notification.remove(), 5000);
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

async function loadRecentActivity(user) {
    const activityList = document.getElementById('activityList');
    activityList.innerHTML = '<div class="no-data"><p>Loading activity...</p></div>';

    try {
        const { data: shipments, error } = await supabase
            .from('shipments')
            .select('*')
            .eq('shipper_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;

        if (!shipments || shipments.length === 0) {
            activityList.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-clock" style="font-size: 3rem; color: var(--text-lighter); margin-bottom: 1rem;"></i>
                    <p>No recent activity</p>
                </div>
            `;
            return;
        }

        activityList.innerHTML = shipments.map(shipment => {
            const timeAgo = getTimeAgo(new Date(shipment.created_at));
            let icon, iconClass, text;
            
            if (shipment.status === 'delivered') {
                icon = 'fa-check-circle';
                iconClass = 'success';
                text = `Shipment #${shipment.id.slice(-8)} was delivered`;
            } else if (shipment.status === 'in_transit') {
                icon = 'fa-truck';
                iconClass = 'info';
                text = `Shipment #${shipment.id.slice(-8)} is in transit`;
            } else if (shipment.status === 'accepted') {
                icon = 'fa-gavel';
                iconClass = 'warning';
                text = `Shipment #${shipment.id.slice(-8)} was accepted by carrier`;
            } else {
                icon = 'fa-plus-circle';
                iconClass = 'info';
                text = `Shipment #${shipment.id.slice(-8)} created`;
            }

            return `
                <div class="activity-item">
                    <div class="activity-icon ${iconClass}">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="activity-content">
                        <p>${text}</p>
                        <span class="activity-time">${timeAgo}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Error loading activity:', err);
        activityList.innerHTML = '<div class="no-data" style="color: var(--danger);">Failed to load activity.</div>';
    }
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
        }
    }
    return 'Just now';
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
async function loadStats(user) {
    try {
        const { data: shipments, error } = await supabase
            .from('shipments')
            .select('*')
            .eq('shipper_id', user.id);

        if (error) throw error;

        const activeCount = shipments.filter(s => ['pending', 'accepted', 'in_transit'].includes(s.status)).length;
        const deliveredCount = shipments.filter(s => s.status === 'delivered').length;
        const totalCount = shipments.length;

        document.getElementById('activeCount').textContent = activeCount;
        document.getElementById('totalCount').textContent = totalCount;
        document.getElementById('deliveredCount').textContent = deliveredCount;
    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

