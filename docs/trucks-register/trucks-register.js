import { supabase, supabaseReady } from '../assets/supabaseClient.js';
import { getRedirectUrl } from '../assets/pathUtils.js';

function getAppBasePath() {
    const parts = (window.location.pathname || '/').split('/');
    if (parts.length > 1 && parts[1]) return '/' + parts[1];
    return '';
}

document.addEventListener('DOMContentLoaded', async () => {
    // Ensure Supabase client is initialized before any auth actions
    try {
        await supabaseReady;
    } catch (err) {
        console.error('Supabase init error:', err);
        // Let the page continue — auth calls will throw meaningful errors if supabase isn't available
    }
    const form = document.getElementById('truckRegisterForm');

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
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Clear previous errors
        ['basicEmail', 'basicPassword', 'confirmPassword'].forEach(id => clearError(id));

        if (!emailRegex.test(document.getElementById('basicEmail').value.trim())) { isValid = false; showError('basicEmail', 'A valid email is required.'); }
        if (document.getElementById('basicPassword').value.trim().length < 6) { isValid = false; showError('basicPassword', 'Password must be at least 6 characters.'); }
        if (document.getElementById('basicPassword').value.trim() !== document.getElementById('confirmPassword').value.trim()) { isValid = false; showError('confirmPassword', 'Passwords do not match.'); }
        if (!document.getElementById('agreeTerms').checked) { isValid = false; alert('You must agree to the Terms and Conditions to continue.'); }
        
        return isValid;
    };

    // Google OAuth registration
    document.getElementById('googleBtn').addEventListener('click', async () => {
        try {
            const googleBtn = document.getElementById('googleBtn');
            googleBtn.disabled = true;
            googleBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
            
            // Set expected role for OAuth callback validation
            localStorage.setItem('expectedRole', 'truck_owner');
            localStorage.setItem('post_auth_redirect', '../trucks-register/complete-profile.html');
            const redirectUrl = getRedirectUrl('/docs/auth/callback.html');
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
            console.error('Google registration error:', error);
            alert('Google registration failed: ' + error.message);
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
            alert('Please fix the errors before submitting.');
            return;
        }

        const submitBtn = document.getElementById('submitRegistration');
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        // Collect form data
        const email = document.getElementById('basicEmail').value.trim();
        const password = document.getElementById('basicPassword').value.trim();

        try {
            await supabaseReady;
            
            // Fast duplicate email check
            const { data: existingUser } = await supabase.auth.admin.listUsers({
                filter: `email.eq.${email}`
            }).catch(() => ({ data: null })); // Ignore admin errors
            
            // Sign up the user (Supabase handles duplicates gracefully)
            const { data: { user }, error: signUpError } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        user_role: 'truck_owner'
                    }
                }
            });

            if (signUpError) throw signUpError;
            if (!user) throw new Error('User registration failed unexpectedly.');

            // 3. Display success message
            const form = document.getElementById('truckRegisterForm');
            const successSection = document.getElementById('registrationSuccess');
            
            if (form) form.style.display = 'none';
            
            if (successSection) {
                successSection.style.display = 'block';
                const userEmailEl = document.getElementById('userEmail');
                if (userEmailEl) userEmailEl.textContent = email;
            } else {
                // Fallback if success section doesn't exist
                alert(`Registration successful! Please check your email (${email}) for verification.`);
                window.location.href = '../trucks-login/trucks-login.html';
            }
            
            // Re-translate the page to ensure the success message is in the correct language
            if (window.appTranslations?.translatePage) {
                window.appTranslations.translatePage(window.appTranslations.getLanguage());
            }

        } catch (err) {
            console.error('Registration error:', err);
            alert('Registration Failed: ' + err.message);
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    });
});