import { supabase, supabaseReady } from '../assets/supabaseClient.js';
import { getRedirectUrl } from '../assets/pathUtils.js';

// Compute base path dynamically so the app works when hosted under a repo subpath (GitHub Pages)
function getAppBasePath() {
    const parts = (window.location.pathname || '/').split('/');
    if (parts.length > 1 && parts[1]) return '/' + parts[1];
    return '';
}

document.addEventListener('DOMContentLoaded', async () => {
    // Check for error message in URL
    const urlParams = new URLSearchParams(window.location.search);
    const errorMsg = urlParams.get('error');
    if (errorMsg) {
        alert(errorMsg);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Check if user is already logged in
    try {
        await supabaseReady;
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.user) {
            const userRole = session.user.user_metadata?.user_role;
            if (userRole === 'truck_owner') {
                // Check if profile is completed
                try {
                    const { data: vehicle } = await supabase
                        .from('vehicles')
                        .select('*')
                        .eq('user_id', session.user.id)
                        .single();
                    
                    if (vehicle) {
                        window.location.replace('../trucks-dashboard-cheak/truck-dashboard.html');
                        return;
                    } else {
                        window.location.replace('../trucks-register/complete-profile.html');
                        return;
                    }
                } catch (err) {
                    window.location.replace('../trucks-register/complete-profile.html');
                    return;
                }
            }
        }
    } catch (error) {
        console.log('No existing session found');
    }
    
    const form = document.getElementById('truckLoginForm');

    // --- Validation Logic ---
    const showError = (inputId, message) => {
        const input = document.getElementById(inputId);
        const errorDiv = input.closest('.form-group').querySelector('.error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    };

    const clearError = (inputId) => {
        const input = document.getElementById(inputId);
        const errorDiv = input.closest('.form-group').querySelector('.error-message');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    };

    const validateForm = () => {
        let isValid = true;
        
        // Clear previous errors
        ['loginEmail', 'loginPassword'].forEach(id => clearError(id));

        if (document.getElementById('loginEmail').value.trim() === '') {
            isValid = false;
            showError('loginEmail', 'Email is required.');
        }
        if (document.getElementById('loginPassword').value.trim() === '') {
            isValid = false;
            showError('loginPassword', 'Password is required.');
        }
        
        return isValid;
    };

    // Google OAuth login
    document.getElementById('googleBtn').addEventListener('click', async () => {
        try {
            // Ensure Supabase client is ready (loads CDN if necessary)
            await supabaseReady;
            const googleBtn = document.getElementById('googleBtn');
            googleBtn.disabled = true;
            googleBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
            
            // Check if user already exists with different role
            const { data: existingSession } = await supabase.auth.getSession();
            if (existingSession?.user) {
                const userRole = existingSession.user.user_metadata?.user_role;
                if (userRole && userRole !== 'truck_owner') {
                    await supabase.auth.signOut();
                    alert('This account is registered as a shipper. Please use the shipper login or create a new truck owner account.');
                    googleBtn.disabled = false;
                    googleBtn.innerHTML = `<svg class="google-icon" viewBox="0 0 24 24" width="20" height="20">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg> Continue with Google`;
                    return;
                }
            }
            
            console.log('Starting Google OAuth...');
            // remember where to return after auth
            localStorage.setItem('userRole', 'truck_owner'); // Set role before redirect
            localStorage.setItem('post_auth_redirect', window.location.href);
            const redirectUrl = getRedirectUrl('/docs/trucks-dashboard-cheak/truck-dashboard.html');
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl // Redirect to truck dashboard after login
                }
            });

            if (error) throw error;

            // supabase-js may return a redirect URL. If the browser blocked a popup
            // or the SDK didn't perform a redirect automatically, navigate to the URL.
            if (data && data.url) {
                console.log('Redirecting to OAuth URL (fallback):', data.url);
                window.location.href = data.url;
            }
        } catch (error) {
            console.error('Google login error:', error);
            alert('Google login failed: ' + error.message);
            const googleBtn = document.getElementById('googleBtn');
            googleBtn.disabled = false;
            googleBtn.innerHTML = `<svg class="google-icon" viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg> Continue with Google`;
        }
    });

    // --- Form Submission ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        const submitBtn = document.getElementById('submitLogin');
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value.trim();

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;

            // Check user role
            const userRole = data.user?.user_metadata?.user_role;
            if (userRole && userRole.startsWith('shipper')) {
                await supabase.auth.signOut();
                throw new Error(window.appTranslations.translations[window.appTranslations.getLanguage()].loginErrorShipperAccount || 'This is a truck owner login. Please use the shipper login page.');
            }

            // Check if profile is completed
            const profileCompleted = data.user?.user_metadata?.profile_completed;
            if (!profileCompleted) {
                window.location.href = '../trucks-register/complete-profile.html';
            } else {
                window.location.href = '../trucks-dashboard-cheak/truck-dashboard.html';
            } 

        } catch (err) {
            console.error('Login error:', err);
            showError('loginPassword', err.message); // Show error message near the form
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    });
});