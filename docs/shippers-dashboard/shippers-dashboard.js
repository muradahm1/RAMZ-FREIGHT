import { supabase, supabaseReady } from '../assets/supabaseClient.js';
import { notificationManager } from '../assets/notifications.js';
import { initHamburgerMenu } from '../assets/hamburger-menu.js';
import { createLanguageSwitcher } from '../assets/language-switcher.js';
import { setLanguage, getLanguage } from '../assets/translations.js';
import { persistentAuth } from '../assets/persistent-auth.js';

// Sanitization function
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', async () => {
    const userProfile = document.querySelector('.user-profile');
    const userNameSpan = document.querySelector('.user-name');
    const userAvatar = document.querySelector('.user-avatar');
    const welcomeMessage = document.getElementById('welcome-message');

    // Fast persistent auth check
    const isValid = await persistentAuth.initDashboard();
    if (!isValid) {
        return; // Will redirect to homepage
    }

    await supabaseReady;
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        // Handle profile creation for Google sign-in on initial load
        const userRole = localStorage.getItem('userRole');
        if (userRole === 'shipper' && session.user.app_metadata.provider === 'google') {
            await createShipperProfile(session.user);
            localStorage.removeItem('userRole');
        }
        setupDashboard(session.user);
    } else {
        persistentAuth.logout();
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user.app_metadata.provider === 'google') {
            const userRole = localStorage.getItem('userRole');
            if (userRole === 'shipper') {
                await createShipperProfile(session.user);
                localStorage.removeItem('userRole'); // Clean up role
            }
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
        const profileName = sanitizeHTML(user.user_metadata?.full_name || user.email.split('@')[0]);
        userNameSpan.textContent = profileName;
        
        // Use translation for welcome message
        if (window.appTranslations && typeof window.appTranslations.getLanguage === 'function') {
            const lang = window.appTranslations.getLanguage();
            const translatedWelcome = window.appTranslations.translations[lang].welcomeBackMessage || 'Welcome back, {name}!';
            welcomeMessage.textContent = translatedWelcome.replace('{name}', profileName) + ' 👋';
        } else {
            welcomeMessage.textContent = `Welcome back, ${profileName}! 👋`;
        }
        
        // Use a default avatar or one from metadata if available
        userAvatar.src = user.user_metadata?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(profileName)}`;

        // --- 3. Logout Functionality ---
        userProfile.addEventListener('click', async () => {
            if (confirm('Are you sure you want to log out?')) {
                persistentAuth.logout();
            }
        });

        // --- 4. Load Dynamic Content ---
        loadStats(user);
        loadActiveShipments(user);
        loadRecentActivity(user); // This is for truck owners dashboard, not shippers. Should be removed or ignored for shippers.
        // loadAvailableTrucks(); // Removed as it's not relevant for shipper dashboard
        notificationManager.init(user.id, 'shipper');
        
        // --- 5. Initialize Hamburger Menu ---
        initHamburgerMenu();
        
        // --- 6. Initialize Language Switcher ---
        const langContainer = document.getElementById('langSwitcher');
        if (langContainer) {
            langContainer.innerHTML = ''; // Clear existing switcher to prevent duplicates
            langContainer.appendChild(createLanguageSwitcher());
        }

        // After all dynamic content is loaded, re-apply translations
        if (window.appTranslations && typeof window.appTranslations.translatePage === 'function') {
            window.appTranslations.translatePage(window.appTranslations.getLanguage());
        }
        // Re-apply translations after dynamic content is loaded
        if (window.appTranslations && typeof window.appTranslations.translatePage === 'function') {
            window.appTranslations.translatePage(window.appTranslations.getLanguage());
        }
    }


});

async function loadActiveShipments(user) {
    const shipmentsList = document.getElementById('shipmentsList');
    shipmentsList.innerHTML = '<div class="no-data"><p data-translate="loadingShipments">Loading your shipments...</p></div>';

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
                    <p><span data-translate="noActiveShipments">No active shipments.</span> <a href="../create-shipment/create-shipment.html" style="color: var(--primary);" data-translate="createOneNow">Create one now!</a></p>
                </div>
            `;
        } else {
            shipmentsList.innerHTML = '';
            shipments.forEach(shipment => {
                const shipmentLink = document.createElement('a');
                shipmentLink.href = `../live-tracking/live-tracking.html?shipment_id=${encodeURIComponent(shipment.id)}`;
                shipmentLink.className = 'shipment-card-link';
                
                const shipmentCard = document.createElement('div');
                shipmentCard.className = 'shipment-card';
                
                const shipmentInfo = document.createElement('div');
                shipmentInfo.className = 'shipment-info';
                
                const title = document.createElement('h4');
                title.textContent = shipment.goods_description || 'Shipment';
                
                const details = document.createElement('div');
                details.className = 'shipment-details';
                
                const origin = document.createElement('span');
                origin.innerHTML = '<i class="fas fa-map-marker-alt"></i> ' + sanitizeHTML(shipment.origin_address);
                
                const arrow = document.createElement('span');
                arrow.innerHTML = '<i class="fas fa-arrow-right"></i> ' + sanitizeHTML(shipment.destination_address);
                
                const weight = document.createElement('span');
                weight.innerHTML = '<i class="fas fa-weight"></i> ' + sanitizeHTML(shipment.weight_kg || '0') + ' kg';
                
                const status = document.createElement('div');
                status.className = `shipment-status status-${sanitizeHTML(shipment.status.toLowerCase())}`;
                status.textContent = shipment.status.toUpperCase();
                
                details.appendChild(origin);
                details.appendChild(arrow);
                details.appendChild(weight);
                
                shipmentInfo.appendChild(title);
                shipmentInfo.appendChild(details);
                
                shipmentCard.appendChild(shipmentInfo);
                shipmentCard.appendChild(status);
                
                shipmentLink.appendChild(shipmentCard);
                shipmentsList.appendChild(shipmentLink);
            });
        }
        // Re-apply translations after dynamic content is loaded
        if (window.appTranslations && typeof window.appTranslations.translatePage === 'function') {
            window.appTranslations.translatePage(window.appTranslations.getLanguage());
        }
        // Re-apply translations after dynamic content is loaded
        if (window.appTranslations && typeof window.appTranslations.translatePage === 'function') {
            window.appTranslations.translatePage(window.appTranslations.getLanguage());
        }
    } catch (err) {
        console.error("Error loading shipments:", err);
        shipmentsList.innerHTML = '<div class="no-data" style="color: var(--danger);">Failed to load shipments.</div>';
    }
}

async function loadRecentActivity(user) {
    const activityList = document.getElementById('activityList');
    activityList.innerHTML = '<div class="no-data"><p data-translate="loadingActivity">Loading activity...</p></div>';

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
                    <p data-translate="noRecentActivity">No recent activity</p>
                </div>
            `;
            return;
        }

        activityList.innerHTML = shipments.map(shipment => {
            const timeAgo = getTimeAgo(new Date(shipment.created_at));
            let icon, iconClass, textKey;
            
            if (shipment.status === 'delivered') {
                icon = 'fa-check-circle';
                iconClass = 'success';
                textKey = 'shipmentDeliveredText';
            } else if (shipment.status === 'in_transit') {
                icon = 'fa-truck';
                iconClass = 'info';
                textKey = 'shipmentInTransitText';
            } else if (shipment.status === 'accepted') {
                icon = 'fa-gavel';
                iconClass = 'warning';
                textKey = 'shipmentAcceptedByCarrierText';
            } else {
                icon = 'fa-plus-circle';
                iconClass = 'info';
                textKey = 'shipmentCreatedText';
            }

            return `
                <div class="activity-item">
                    <div class="activity-icon ${iconClass}">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="activity-content">
                        <p><span data-translate="${textKey}"></span> #${shipment.id.slice(-8)}</p>
                        <span class="activity-time">${timeAgo}</span>
                    </div>
                </div>
            `;
        }).join('');
        // Re-apply translations after dynamic content is loaded
        if (window.appTranslations && typeof window.appTranslations.translatePage === 'function') {
            window.appTranslations.translatePage(window.appTranslations.getLanguage());
        }
        // Re-apply translations after dynamic content is loaded
        if (window.appTranslations && typeof window.appTranslations.translatePage === 'function') {
            window.appTranslations.translatePage(window.appTranslations.getLanguage());
        }
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