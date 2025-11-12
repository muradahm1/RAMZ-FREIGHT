// Auto-redirect logged-in users to their dashboard
import { supabase, supabaseReady } from '../assets/supabaseClient.js';

// Show loading indicator
function showLoading() {
    const loading = document.createElement('div');
    loading.id = 'auth-loading';
    loading.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(15, 15, 15, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        color: white;
        font-size: 1.2rem;
    `;
    loading.innerHTML = '<div><i class="fas fa-spinner fa-spin"></i> Checking login status...</div>';
    document.body.appendChild(loading);
}

function hideLoading() {
    const loading = document.getElementById('auth-loading');
    if (loading) loading.remove();
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        showLoading();
        await supabaseReady;
        
        // Check if user is already logged in
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.user) {
            const user = session.user;
            
            // Determine user type by checking database tables
            const [shipperResult, vehicleResult] = await Promise.all([
                supabase.from('shippers').select('id').eq('user_id', user.id).single(),
                supabase.from('vehicles').select('id').eq('user_id', user.id).single()
            ]);
            
            if (shipperResult.data) {
                // User is a shipper
                window.location.replace('../shippers-dashboard/shippers-dashboard.html');
                return;
            } else if (vehicleResult.data) {
                // User is a truck owner with completed profile
                window.location.replace('../trucks-dashboard-cheak/truck-dashboard.html');
                return;
            } else {
                // Check if user has truck owner metadata but incomplete profile
                const userRole = user.user_metadata?.user_role;
                if (userRole === 'truck_owner') {
                    window.location.replace('../trucks-register/complete-profile.html');
                    return;
                }
            }
        }
        
        // No session or unrecognized user - show homepage
        hideLoading();
        
    } catch (error) {
        console.log('Session check error:', error);
        hideLoading();
    }
});

// Also listen for auth state changes
supabaseReady.then(() => {
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            // User just signed in, redirect them
            location.reload();
        }
    });
});