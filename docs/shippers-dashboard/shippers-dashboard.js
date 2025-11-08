import { supabase, supabaseReady } from '../assets/supabaseClient.js';
import { notificationManager } from '../assets/notifications.js';
import { initHamburgerMenu } from '../assets/hamburger-menu.js';
import { createLanguageSwitcher } from '../assets/language-switcher.js';
import { setLanguage, getLanguage } from '../assets/translations.js';

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
        setupDashboard(session.user);
    } else {
        window.location.replace('../shippers-login/shippers-login.html');
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
            setupDashboard(session.user);
        } else {
            window.location.replace('../shippers-login/shippers-login.html');
        }
    });

    function setupDashboard(user) {
        // Populate User Info
        const profileName = user.user_metadata?.full_name || user.email.split('@')[0];
        userNameSpan.textContent = profileName;
        welcomeMessage.textContent = `Welcome back, ${profileName}! 👋`;
        userAvatar.src = user.user_metadata?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${profileName}`;

        // Logout Functionality
        userProfile.addEventListener('click', async () => {
            if (confirm('Are you sure you want to log out?')) {
                await supabase.auth.signOut();
            }
        });

        // Load Dynamic Content
        loadStats(user);
        loadActiveShipments(user);
        loadRecentActivity(user);
        notificationManager.init(user.id, 'shipper');
        
        // Initialize UI Components
        initHamburgerMenu();
        const langContainer = document.getElementById('langSwitcher');
        if (langContainer) {
            langContainer.appendChild(createLanguageSwitcher());
        }

        // Apply translations once
        setTimeout(() => {
            if (window.appTranslations?.translatePage) {
                window.appTranslations.translatePage(window.appTranslations.getLanguage());
            }
        }, 100);
    }
});

async function loadActiveShipments(user) {
    const shipmentsList = document.getElementById('shipmentsList');
    shipmentsList.innerHTML = '<div class="no-data"><p>Loading shipments...</p></div>';

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
            <a href="../live-tracking/live-tracking.html?shipment_id=${shipment.id}" class="shipment-card-link">
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
            </a>
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
                text = 'Shipment was delivered';
            } else if (shipment.status === 'in_transit') {
                icon = 'fa-truck';
                iconClass = 'info';
                text = 'Shipment is in transit';
            } else if (shipment.status === 'accepted') {
                icon = 'fa-gavel';
                iconClass = 'warning';
                text = 'Shipment was accepted by carrier';
            } else {
                icon = 'fa-plus-circle';
                iconClass = 'info';
                text = 'Shipment created';
            }

            return `
                <div class="activity-item">
                    <div class="activity-icon ${iconClass}">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="activity-content">
                        <p>${text} #${shipment.id.slice(-8)}</p>
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