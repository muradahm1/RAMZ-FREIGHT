import { supabase, backendUrl, supabaseReady } from '../assets/supabaseClient.js';
import { getRedirectUrl } from '../assets/pathUtils.js';

function getAppBasePath() {
    const parts = (window.location.pathname || '/').split('/');
    if (parts.length > 1 && parts[1]) return '/' + parts[1];
    return '';
}

// Demo account functionality
window.fillDemoAccount = function(email, password) {
    document.getElementById('email').value = email;
    document.getElementById('password').value = password;
};



document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('shipperLoginForm');
    const submitBtn = document.getElementById('loginBtn');
    const googleBtn = document.getElementById('googleBtn');
    
    // Password toggle functionality
    const togglePassword = document.querySelector('.toggle-password');
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const input = document.getElementById('password');
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    }

    if (!loginForm) {
        console.error('Login form with ID "shipperLoginForm" not found.');
        return;
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        const originalButtonText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging In...';

        const loginData = {
            email: emailInput.value.trim(),
            password: passwordInput.value,
        };

        try {
            await supabaseReady;
            const { data, error } = await supabase.auth.signInWithPassword({
                email: loginData.email,
                password: loginData.password,
            });

            if (error) throw error;

            alert('Login successful! Redirecting to your dashboard...');
            window.location.href = '../shippers-dashboard/shippers-dashboard.html';

        } catch (error) {
            console.error('Login error:', error);
            alert(`Login Failed: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalButtonText;
        }
    });

    // Google OAuth login
    googleBtn.addEventListener('click', async () => {
        try {
            googleBtn.disabled = true;
            googleBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
            
            localStorage.setItem('post_auth_redirect', window.location.href);
            const redirectUrl = getRedirectUrl('/docs/shippers-dashboard/shippers-dashboard.html');
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    }
                }
            });

            if (error) throw error;
        } catch (error) {
            console.error('Google login error:', error);
            alert('Google login failed: ' + error.message);
            googleBtn.disabled = false;
            googleBtn.innerHTML = '<img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAxOCAxOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE2LjUxIDkuMjA0NTVWOS4wOTU0NUg5LjE4VjEwLjc5NTVIMTMuNDZDMTMuMDIgMTIuODU1NSAxMS4xNCAxNC4zMTU1IDkgMTQuMzE1NUM1LjY5IDE0LjMxNTUgMy4wMiAxMS42NDU1IDMuMDIgOC4zMzU1QzMuMDIgNS4wMjU1IDUuNjkgMi4zNTU1IDkgMi4zNTU1QzEwLjQ3IDIuMzU1NSAxMS44MSAyLjk5NTUgMTIuNzggMy45NDU1TDE0Ljg5NSAxLjgzQzEzLjM2IDAuMzkgMTEuMzkgLTAuNDUgOSAtMC40NUM0LjA2IC0wLjQ1IDAgMy42MDU1IDAgOC4zMzU1QzAgMTMuMDY1NSA0LjA2IDE3LjUxNTUgOSAxNy41MTU1QzEzLjYzIDE3LjUxNTUgMTcuMjMgMTMuNzE1NSAxNy4yMyA4LjMzNTVDMTcuMjMgNy42NDU1IDE3LjEzIDYuOTk1NSAxNi45NyA2LjM3NDVMMTYuNTEgOS4yMDQ1WiIgZmlsbD0iIzQyODVGMyIvPgo8L3N2Zz4K" alt="Google"> Continue with Google';
        }
    });
});