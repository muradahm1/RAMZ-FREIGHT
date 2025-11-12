// Persistent authentication like Telegram
import { supabase, supabaseReady } from './supabaseClient.js';

class PersistentAuth {
    constructor() {
        this.SESSION_KEY = 'ramz_user_session';
        this.USER_TYPE_KEY = 'ramz_user_type';
        this.LAST_ACTIVITY_KEY = 'ramz_last_activity';
        this.SESSION_TIMEOUT = 30 * 24 * 60 * 60 * 1000; // 30 days like Telegram
    }

    // Update last activity timestamp
    updateActivity() {
        localStorage.setItem(this.LAST_ACTIVITY_KEY, Date.now().toString());
    }

    // Check if session is still valid
    isSessionValid() {
        const lastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);
        if (!lastActivity) return false;
        
        const timeSinceActivity = Date.now() - parseInt(lastActivity);
        return timeSinceActivity < this.SESSION_TIMEOUT;
    }

    // Initialize persistent auth for dashboard pages
    async initDashboard() {
        await supabaseReady;
        
        // Update activity on page load
        this.updateActivity();
        
        // Set up activity tracking
        this.setupActivityTracking();
        
        // Check session validity
        if (!this.isSessionValid()) {
            this.logout();
            return false;
        }

        // Verify session with Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            this.logout();
            return false;
        }

        return true;
    }

    // Set up activity tracking (like Telegram)
    setupActivityTracking() {
        // Track user interactions
        const events = ['click', 'keypress', 'scroll', 'mousemove', 'touchstart'];
        
        let activityTimer;
        const updateActivityThrottled = () => {
            clearTimeout(activityTimer);
            activityTimer = setTimeout(() => {
                this.updateActivity();
            }, 30000); // Update every 30 seconds max
        };

        events.forEach(event => {
            document.addEventListener(event, updateActivityThrottled, { passive: true });
        });

        // Update activity every 5 minutes when page is visible
        setInterval(() => {
            if (!document.hidden) {
                this.updateActivity();
            }
        }, 5 * 60 * 1000);
    }

    // Logout and clear all data
    logout() {
        localStorage.removeItem(this.SESSION_KEY);
        localStorage.removeItem(this.USER_TYPE_KEY);
        localStorage.removeItem(this.LAST_ACTIVITY_KEY);
        
        // Sign out from Supabase
        supabase.auth.signOut();
        
        // Redirect to homepage
        window.location.replace('../homepage/homepage.html');
    }

    // Cache user session data
    cacheSession(session, userType) {
        try {
            localStorage.setItem(this.SESSION_KEY, JSON.stringify({
                userId: session.user.id,
                email: session.user.email,
                userType: userType,
                timestamp: Date.now()
            }));
            localStorage.setItem(this.USER_TYPE_KEY, userType);
            this.updateActivity();
        } catch (e) {
            console.log('Cache error:', e);
        }
    }

    // Get cached session
    getCachedSession() {
        try {
            const cached = localStorage.getItem(this.SESSION_KEY);
            return cached ? JSON.parse(cached) : null;
        } catch {
            return null;
        }
    }
}

// Export singleton instance
export const persistentAuth = new PersistentAuth();