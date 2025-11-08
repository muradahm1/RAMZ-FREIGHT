// Check for existing session and redirect to appropriate dashboard
import { supabase, supabaseReady } from '../assets/supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await supabaseReady;
        
        // Check if user is already logged in
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.user) {
            const user = session.user;
            const userRole = user.user_metadata?.user_role;
            
            console.log('Found existing session for:', user.email, 'Role:', userRole);
            
            // Redirect based on user role
            if (userRole === 'shipper') {
                window.location.replace('../shippers-dashboard/shippers-dashboard.html');
            } else if (userRole === 'truck_owner') {
                // Check if profile is completed
                try {
                    const { data: vehicle } = await supabase
                        .from('vehicles')
                        .select('*')
                        .eq('user_id', user.id)
                        .single();
                    
                    if (vehicle) {
                        window.location.replace('../trucks-dashboard-cheak/truck-dashboard.html');
                    } else {
                        window.location.replace('../trucks-register/complete-profile.html');
                    }
                } catch (err) {
                    // If error checking vehicle, redirect to complete profile
                    window.location.replace('../trucks-register/complete-profile.html');
                }
            }
        }
    } catch (error) {
        console.log('No existing session found or error checking session:', error);
        // Continue to show homepage
    }
});