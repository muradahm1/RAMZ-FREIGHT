// Fast session check with caching like Telegram
import { supabase, supabaseReady } from '../assets/supabaseClient.js';

// Cache user session data
const SESSION_CACHE_KEY = 'ramz_user_session';
const USER_TYPE_CACHE_KEY = 'ramz_user_type';

function getCachedSession() {
    try {
        const cached = localStorage.getItem(SESSION_CACHE_KEY);
        return cached ? JSON.parse(cached) : null;
    } catch {
        return null;
    }
}

function setCachedSession(session, userType) {
    try {
        localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({
            userId: session.user.id,
            email: session.user.email,
            timestamp: Date.now()
        }));
        localStorage.setItem(USER_TYPE_CACHE_KEY, userType);
    } catch (e) {
        console.log('Cache error:', e);
    }
}

function clearCache() {
    localStorage.removeItem(SESSION_CACHE_KEY);
    localStorage.removeItem(USER_TYPE_CACHE_KEY);
}

function redirectToUserDashboard(userType) {
    const routes = {
        'shipper': '../shippers-dashboard/shippers-dashboard.html',
        'truck_owner': '../trucks-dashboard-cheak/truck-dashboard.html',
        'truck_owner_incomplete': '../trucks-register/complete-profile.html'
    };
    
    const route = routes[userType];
    if (route) {
        window.location.replace(route);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Fast check using cached data first
    const cachedSession = getCachedSession();
    const cachedUserType = localStorage.getItem(USER_TYPE_CACHE_KEY);
    
    if (cachedSession && cachedUserType) {
        // Check if cache is still valid (less than 1 hour old)
        const cacheAge = Date.now() - cachedSession.timestamp;
        if (cacheAge < 3600000) { // 1 hour
            redirectToUserDashboard(cachedUserType);
            return;
        }
    }
    
    // If no valid cache, do quick session check
    try {
        await supabaseReady;
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.user) {
            // Quick user type determination
            const userRole = session.user.user_metadata?.user_role;
            
            if (userRole === 'shipper') {
                setCachedSession(session, 'shipper');
                redirectToUserDashboard('shipper');
                return;
            } else if (userRole === 'truck_owner') {
                // Quick check for completed profile
                const { data: vehicle } = await supabase
                    .from('vehicles')
                    .select('id')
                    .eq('user_id', session.user.id)
                    .single();
                
                const userType = vehicle ? 'truck_owner' : 'truck_owner_incomplete';
                setCachedSession(session, userType);
                redirectToUserDashboard(userType);
                return;
            }
        }
        
        // No valid session - clear cache and show homepage
        clearCache();
        
    } catch (error) {
        console.log('Session check error:', error);
        clearCache();
    }
});

// Listen for auth changes and update cache
supabaseReady.then(() => {
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            // Clear old cache and reload to determine user type
            clearCache();
            location.reload();
        } else if (event === 'SIGNED_OUT') {
            // Clear cache on logout
            clearCache();
        }
    });
});