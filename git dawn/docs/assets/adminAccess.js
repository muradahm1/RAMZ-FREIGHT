// Internal Admin Access Configuration
// This simulates how big companies handle internal management systems

export const ADMIN_CONFIG = {
    // Internal network access only
    allowedNetworks: ['192.168.', '10.0.', '172.16.'],
    
    // Admin access tokens (in real systems, these would be environment variables)
    adminTokens: [
        'RAMZ_ADMIN_2024',
        'INTERNAL_MGMT_ACCESS'
    ],
    
    // Check if current session has admin access
    hasAdminAccess() {
        // Check for admin token in session
        const adminToken = sessionStorage.getItem('admin_token');
        return this.adminTokens.includes(adminToken);
    },
    
    // Grant admin access (for internal use)
    grantAccess(token) {
        if (this.adminTokens.includes(token)) {
            sessionStorage.setItem('admin_token', token);
            sessionStorage.setItem('admin_role', 'system_administrator');
            return true;
        }
        return false;
    },
    
    // Revoke admin access
    revokeAccess() {
        sessionStorage.removeItem('admin_token');
        sessionStorage.removeItem('admin_role');
    }
};

// Auto-grant access for development (remove in production)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    ADMIN_CONFIG.grantAccess('RAMZ_ADMIN_2024');
}