import { supabase, backendUrl, supabaseReady } from '../assets/supabaseClient.js';
import { getRedirectUrl } from '../assets/pathUtils.js';

function getAppBasePath() {
    const parts = (window.location.pathname || '/').split('/');
    if (parts.length > 1 && parts[1]) return '/' + parts[1];
    return '';
}

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('shipperRegisterForm');
    const submitBtn = document.getElementById('submitBtn');
    const googleBtn = document.getElementById('googleBtn');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const passwordStrength = document.getElementById('passwordStrength');

    // Password strength checker
    passwordInput.addEventListener('input', () => {
        const password = passwordInput.value;
        const strength = checkPasswordStrength(password);
        updatePasswordStrength(strength);
    });

    // Real-time password match validation
    confirmPasswordInput.addEventListener('input', () => {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const formGroup = confirmPasswordInput.closest('.form-group');
        
        // Remove existing error
        formGroup.classList.remove('error');
        const existingError = formGroup.querySelector('.error-message');
        if (existingError) existingError.remove();
        
        // Check if passwords match
        if (confirmPassword && password !== confirmPassword) {
            showFieldError(confirmPasswordInput, 'Passwords do not match');
        }
    });

    // Password toggle functionality
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.previousElementSibling;
            const icon = btn.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
    });

    function checkPasswordStrength(password) {
        let score = 0;
        if (password.length >= 8) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        
        if (score < 3) return 'weak';
        if (score < 5) return 'medium';
        return 'strong';
    }

    function updatePasswordStrength(strength) {
        passwordStrength.className = 'password-strength';
        const strengthText = passwordStrength.querySelector('.strength-text');
        
        switch (strength) {
            case 'weak':
                passwordStrength.classList.add('password-weak');
                strengthText.textContent = 'Weak password';
                break;
            case 'medium':
                passwordStrength.classList.add('password-medium');
                strengthText.textContent = 'Medium password';
                break;
            case 'strong':
                passwordStrength.classList.add('password-strong');
                strengthText.textContent = 'Strong password';
                break;
        }
    }

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fullNameInput = document.getElementById('fullName');
        const emailInput = document.getElementById('email');
        const phoneInput = document.getElementById('phone');
        const agreeTermsInput = document.getElementById('agreeTerms');
        const companyNameInput = document.getElementById('companyName');
        const businessTypeInput = document.getElementById('businessType');

        // Validation
        if (!validateForm()) return;

        const originalButtonText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';

        const signupData = {
            fullName: fullNameInput.value.trim(),
            email: emailInput.value.trim(),
            password: passwordInput.value,
            phone: phoneInput.value.trim(),
            companyName: companyNameInput.value.trim() || null,
            businessType: businessTypeInput.value || null,
            userType: 'shipper'
        };

        try {
            // Use backend for secure registration
            const response = await fetch(`${backendUrl}/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(signupData),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Registration failed');
            }

            window.location.href = 'registration-success.html';

        } catch (error) {
            console.error('Registration error:', error);
            showError(error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalButtonText;
        }
    });

    function validateForm() {
        let isValid = true;
        
        // Clear previous errors
        document.querySelectorAll('.form-group').forEach(group => {
            group.classList.remove('error');
            const errorMsg = group.querySelector('.error-message');
            if (errorMsg) errorMsg.remove();
        });

        // Validate required fields
        const requiredFields = [
            { id: 'fullName', message: 'Full name is required' },
            { id: 'email', message: 'Email is required' },
            { id: 'phone', message: 'Phone number is required' },
            { id: 'password', message: 'Password is required' },
            { id: 'confirmPassword', message: 'Please confirm your password' }
        ];

        requiredFields.forEach(field => {
            const input = document.getElementById(field.id);
            if (!input.value.trim()) {
                showFieldError(input, field.message);
                isValid = false;
            }
        });

        // Email validation
        const emailInput = document.getElementById('email');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailInput.value && !emailRegex.test(emailInput.value)) {
            showFieldError(emailInput, 'Please enter a valid email address');
            isValid = false;
        }

        // Password validation
        if (passwordInput.value.length < 6) {
            showFieldError(passwordInput, 'Password must be at least 6 characters long');
            isValid = false;
        }

        // Password match validation
        if (passwordInput.value !== confirmPasswordInput.value) {
            showFieldError(confirmPasswordInput, 'Passwords do not match');
            isValid = false;
        }

        // Terms agreement
        const agreeTermsInput = document.getElementById('agreeTerms');
        if (!agreeTermsInput.checked) {
            showError('You must agree to the Terms of Service and Privacy Policy');
            isValid = false;
        }

        return isValid;
    }

    function showFieldError(input, message) {
        const formGroup = input.closest('.form-group');
        formGroup.classList.add('error');
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        formGroup.appendChild(errorDiv);
    }

    function showError(message) {
        alert(`Error: ${message}`);
    }

    function showSuccess(message) {
        alert(`Success: ${message}`);
    }

    // Google OAuth registration
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
            console.error('Google registration error:', error);
            showError('Google registration failed: ' + error.message);
            googleBtn.disabled = false;
            googleBtn.innerHTML = '<img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAxOCAxOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE2LjUxIDkuMjA0NTVWOS4wOTU0NUg5LjE4VjEwLjc5NTVIMTMuNDZDMTMuMDIgMTIuODU1NSAxMS4xNCAxNC4zMTU1IDkgMTQuMzE1NUM1LjY5IDE0LjMxNTUgMy4wMiAxMS42NDU1IDMuMDIgOC4zMzU1QzMuMDIgNS4wMjU1IDUuNjkgMi4zNTU1IDkgMi4zNTU1QzEwLjQ3IDIuMzU1NSAxMS44MSAyLjk5NTUgMTIuNzggMy45NDU1TDE0Ljg5NSAxLjgzQzEzLjM2IDAuMzkgMTEuMzkgLTAuNDUgOSAtMC40NUM0LjA2IC0wLjQ1IDAgMy42MDU1IDAgOC4zMzU1QzAgMTMuMDY1NSA0LjA2IDE3LjUxNTUgOSAxNy41MTU1QzEzLjYzIDE3LjUxNTUgMTcuMjMgMTMuNzE1NSAxNy4yMyA4LjMzNTVDMTcuMjMgNy42NDU1IDE3LjEzIDYuOTk1NSAxNi45NyA2LjM3NDVMMTYuNTEgOS4yMDQ1WiIgZmlsbD0iIzQyODVGMyIvPgo8L3N2Zz4K" alt="Google"> Continue with Google';
        }
    });
});