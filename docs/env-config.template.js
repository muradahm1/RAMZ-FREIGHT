// Environment Configuration Template
// Copy this file to env-config.js and update with your actual values

window.ENV_CONFIG = {
    // Supabase Configuration
    SUPABASE_URL: 'https://your-project.supabase.co',
    SUPABASE_ANON_KEY: 'your-anon-key-here',
    
    // Backend Configuration
    BACKEND_URL: 'https://your-backend.com',
    
    // API Keys (if needed)
    GOOGLE_MAPS_API_KEY: 'your-google-maps-key',
    
    // Feature Flags
    FEATURES: {
        REAL_TIME_TRACKING: true,
        NOTIFICATIONS: true,
        OFFLINE_MODE: true
    },
    
    // Security Settings
    SECURITY: {
        ENABLE_CSP: true,
        ENABLE_RATE_LIMITING: true,
        SESSION_TIMEOUT: 3600000 // 1 hour
    }
};

// Apply configuration to window object
if (window.ENV_CONFIG) {
    window.SUPABASE_URL = window.ENV_CONFIG.SUPABASE_URL;
    window.SUPABASE_ANON_KEY = window.ENV_CONFIG.SUPABASE_ANON_KEY;
    window.BACKEND_URL = window.ENV_CONFIG.BACKEND_URL;
}