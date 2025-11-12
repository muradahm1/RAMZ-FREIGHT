import { supabase, supabaseReady } from '../assets/supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    const nextBtn = document.getElementById('nextToStep2');
    const prevBtn = document.getElementById('backToStep1');
    const submitBtn = document.getElementById('submitProfile');
    const form = document.getElementById('completeProfileForm');
    
    // Show loading indicator
    const showLoading = (message = 'Loading...') => {
        const loading = document.createElement('div');
        loading.id = 'profile-loading';
        loading.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); display: flex; align-items: center;
            justify-content: center; z-index: 9999; color: white;
        `;
        loading.innerHTML = `<div><i class="fas fa-spinner fa-spin"></i> ${message}</div>`;
        document.body.appendChild(loading);
    };
    
    const hideLoading = () => {
        const loading = document.getElementById('profile-loading');
        if (loading) loading.remove();
    };
    
    showLoading('Checking profile status...');
    
    // Ensure Supabase client is ready before calling auth methods
    try {
        await supabaseReady;
    } catch (err) {
        console.error('Supabase failed to initialize:', err);
        hideLoading();
        alert('Authentication service is temporarily unavailable. Please try again later.');
        return;
    }

    // Fast session and profile check with caching
    try {
        // Check cached profile status first
        const cachedProfileStatus = localStorage.getItem('profile_completed');
        if (cachedProfileStatus === 'true') {
            window.location.href = '../trucks-dashboard-cheak/truck-dashboard.html';
            return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !session.user) {
            hideLoading();
            alert('Please log in first.');
            window.location.href = '../trucks-login/trucks-login.html';
            return;
        }
        
        if (!session.user.email_confirmed_at) {
            hideLoading();
            alert('Please verify your email before completing your profile. Check your inbox for the verification link.');
            await supabase.auth.signOut();
            window.location.href = '../trucks-login/trucks-login.html';
            return;
        }
        
        // Fast profile check with cache
        let existingVehicle = null;
        const cachedVehicle = localStorage.getItem(`vehicle_${session.user.id}`);
        if (cachedVehicle) {
            try {
                const parsed = JSON.parse(cachedVehicle);
                if (parsed.expires_at > Date.now()) {
                    existingVehicle = parsed.data;
                }
            } catch (e) {}
        }
        
        if (!existingVehicle) {
            const { data } = await supabase
                .from('vehicles')
                .select('id')
                .eq('user_id', session.user.id)
                .limit(1)
                .maybeSingle();
            existingVehicle = data;
            
            // Cache for 10 minutes
            localStorage.setItem(`vehicle_${session.user.id}`, JSON.stringify({
                data: existingVehicle,
                expires_at: Date.now() + 600000
            }));
        }
        
        if (existingVehicle) {
            // Cache the result to avoid future checks
            localStorage.setItem('profile_completed', 'true');
            hideLoading();
            alert('Profile already completed. Redirecting to dashboard...');
            window.location.href = '../trucks-dashboard-cheak/truck-dashboard.html';
            return;
        }
        
        // Profile not completed, show form
        hideLoading();
    } catch (err) {
        console.error('Error checking session:', err);
        // Clear all caches on error
        localStorage.removeItem('profile_completed');
        localStorage.removeItem(`vehicle_${session?.user?.id}`);
        hideLoading();
        alert('Failed to verify authentication. Please log in again.');
        window.location.href = '../trucks-login/trucks-login.html';
        return;
    }

    // Step navigation
    nextBtn.addEventListener('click', () => {
        if (validateStep1()) {
            showStep(2);
        }
    });

    prevBtn.addEventListener('click', () => {
        showStep(1);
    });

    // Form submission with immediate feedback
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Immediate visual feedback
        submitBtn.style.transform = 'scale(0.98)';
        setTimeout(() => {
            submitBtn.style.transform = '';
        }, 150);
        
        if (validateStep2()) {
            await submitProfile();
        }
    });
    
    // Add click feedback to submit button
    submitBtn.addEventListener('mousedown', () => {
        submitBtn.style.transform = 'scale(0.95)';
        // Haptic feedback for mobile
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    });
    
    submitBtn.addEventListener('mouseup', () => {
        submitBtn.style.transform = '';
    });
    
    submitBtn.addEventListener('mouseleave', () => {
        submitBtn.style.transform = '';
    });
    
    // Touch events for mobile
    submitBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        submitBtn.style.transform = 'scale(0.95)';
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    });
    
    submitBtn.addEventListener('touchend', () => {
        submitBtn.style.transform = '';
    });

    // File upload handlers
    setupFileUploads();
    
    // Initialize button text
    const btnText = submitBtn.querySelector('.btn-text');
    if (btnText) {
        const translations = window.appTranslations?.translations;
        const currentLang = window.appTranslations?.getLanguage() || 'en';
        btnText.textContent = translations?.[currentLang]?.completeRegistration || 'Complete Registration';
    }

    function validateStep1() {
        const fields = [
            { id: 'basicName', error: 'name-error', message: 'Full name is required' },
            { id: 'basicphone', error: 'phone-error', message: 'Phone number is required' },
            { id: 'carType', error: 'car-type-error', message: 'Vehicle type is required' },
            { id: 'plateNumber', error: 'plate-error', message: 'License plate is required' },
            { id: 'vehicleModel', error: 'model-error', message: 'Vehicle model is required' },
            { id: 'vehicleYear', error: 'year-error', message: 'Vehicle year is required' },
            { id: 'maxLoad', error: 'load-error', message: 'Maximum load capacity is required' }
        ];

        let isValid = true;
        const missingFields = [];
        
        fields.forEach(field => {
            const input = document.getElementById(field.id);
            const errorEl = document.getElementById(field.error);
            
            if (!input || !input.value.trim()) {
                if (errorEl) errorEl.textContent = field.message;
                isValid = false;
                missingFields.push(field.message);
            } else {
                if (errorEl) errorEl.textContent = '';
            }
        });

        if (!isValid) {
            alert('Please fill in all required fields:\n' + missingFields.join('\n'));
        }

        return isValid;
    }

    function validateStep2() {
        const files = [
            { id: 'idFront', error: 'id-front-error', message: 'National ID front is required' },
            { id: 'idBack', error: 'id-back-error', message: 'National ID back is required' },
            { id: 'drivingLicenseFront', error: 'driving-license-front-error', message: 'Driving license front is required' },
            { id: 'drivingLicenseBack', error: 'driving-license-back-error', message: 'Driving license back is required' },
            { id: 'carPhoto', error: 'car-photo-error', message: 'Vehicle photo is required' },
            { id: 'carLicense', error: 'car-license-error', message: 'Vehicle license is required' }
        ];

        let isValid = true;
        const missingFiles = [];
        
        files.forEach(file => {
            const input = document.getElementById(file.id);
            const errorEl = document.getElementById(file.error);
            
            if (!input || !input.files[0]) {
                if (errorEl) errorEl.textContent = file.message;
                isValid = false;
                missingFiles.push(file.message);
            } else {
                if (errorEl) errorEl.textContent = '';
            }
        });
        
        if (!isValid) {
            alert('Please upload all required documents:\n' + missingFiles.join('\n'));
        }

        return isValid;
    }

    function showStep(stepNumber) {
        // Update progress steps
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active');
        });
        document.querySelector(`[data-step="${stepNumber}"]`).classList.add('active');

        // Update form steps
        document.querySelectorAll('.step-form').forEach(form => {
            form.classList.remove('active');
        });
        document.querySelector(`.step-form[data-step="${stepNumber}"]`).classList.add('active');
    }

    function setupFileUploads() {
        const fileInputs = ['idFront', 'idBack', 'drivingLicenseFront', 'drivingLicenseBack', 'carPhoto', 'carLicense'];
        
        fileInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            const nameSpan = document.getElementById(inputId + 'Name');
            
            input.addEventListener('change', (e) => {
                if (e.target.files[0]) {
                    nameSpan.textContent = e.target.files[0].name;
                } else {
                    nameSpan.textContent = 'No file chosen';
                }
            });
        });
    }

    async function submitProfile() {
        console.log('Starting profile submission...');
        setLoading(true);
        
        // Haptic feedback for completion start
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
        
        try {
            console.log('Getting session...');
            const { data: { session } } = await supabase.auth.getSession();
            if (!session || !session.user) {
                throw new Error('User not authenticated');
            }
            const user = session.user;
            console.log('User authenticated:', user.id);

            // Check if user email is verified
            if (!user.email_confirmed_at) {
                throw new Error('Please verify your email before completing your profile. Check your inbox for the verification link.');
            }

            // Upload files with progress
            const btnText = submitBtn.querySelector('.btn-text');
            if (btnText) btnText.textContent = 'Preparing files...';
            
            console.log('Starting file upload...');
            const fileUrls = await uploadFiles();
            console.log('Files uploaded successfully:', fileUrls);
            
            if (btnText) btnText.textContent = 'Saving profile...';

            // Save vehicle data to database
            const vehicleData = {
                user_id: user.id,
                vehicle_type: document.getElementById('carType').value,
                license_plate: document.getElementById('plateNumber').value,
                vehicle_model: document.getElementById('vehicleModel').value,
                vehicle_year: parseInt(document.getElementById('vehicleYear').value),
                max_load_capacity: parseInt(document.getElementById('maxLoad').value),
                status: 'pending_approval',
                id_front_url: fileUrls.idFront,
                id_back_url: fileUrls.idBack,
                driving_licence_front_url: fileUrls.drivingLicenseFront,
                driving_licence_back_url: fileUrls.drivingLicenseBack,
                vehicle_photo_url: fileUrls.carPhoto,
                vehicle_license_url: fileUrls.carLicense
            };
            
            console.log('User ID:', user.id);
            console.log('User verified:', user.email_confirmed_at);

            const { error } = await supabase
                .from('vehicles')
                .insert([vehicleData]);

            if (error) throw error;

            // Update user profile
            const { error: profileError } = await supabase.auth.updateUser({
                data: {
                    full_name: document.getElementById('basicName').value,
                    phone: document.getElementById('basicphone').value,
                    profile_completed: true
                }
            });

            if (profileError) throw profileError;

            // Cache profile completion status and vehicle data
            localStorage.setItem('profile_completed', 'true');
            localStorage.setItem(`vehicle_${user.id}`, JSON.stringify({
                data: { id: 'completed' },
                expires_at: Date.now() + 86400000 // 24 hours
            }));
            
            // Success haptic feedback and animation
            if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200, 100, 200]);
            }
            
            // Success animation
            submitBtn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
            const btnText = submitBtn.querySelector('.btn-text');
            if (btnText) btnText.textContent = '✓ Registration Complete!';
            
            setTimeout(() => {
                alert('Profile completed successfully! Please wait for approval.');
                window.location.href = '../trucks-dashboard-cheak/truck-dashboard.html';
            }, 1500);

        } catch (error) {
            console.error('Error submitting profile:', error);
            console.error('Error stack:', error.stack);
            
            // Error haptic feedback
            if (navigator.vibrate) {
                navigator.vibrate([300, 100, 300]);
            }
            
            // Show detailed error message
            let errorMessage = error.message || 'Unknown error occurred';
            if (error.message.includes('documents')) {
                errorMessage = 'File upload failed. Please check your internet connection and try again.';
            }
            
            alert('Failed to complete profile: ' + errorMessage);
        } finally {
            console.log('Profile submission completed');
            setLoading(false);
        }
    }

    async function uploadFiles() {
        const fileInputs = {
            idFront: document.getElementById('idFront').files[0],
            idBack: document.getElementById('idBack').files[0],
            drivingLicenseFront: document.getElementById('drivingLicenseFront').files[0],
            drivingLicenseBack: document.getElementById('drivingLicenseBack').files[0],
            carPhoto: document.getElementById('carPhoto').files[0],
            carLicense: document.getElementById('carLicense').files[0]
        };

        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        
        // Simple file processing - no compression to avoid issues
        const processFile = (file) => {
            return Promise.resolve(file); // Return file as-is for reliability
        };
        
        const uploadPromises = Object.entries(fileInputs).map(async ([key, file]) => {
            if (!file) return [key, null];
            
            try {
                // Update progress
                const btnText = submitBtn.querySelector('.btn-text');
                if (btnText) btnText.textContent = `Uploading ${key}...`;

                const processedFile = await processFile(file);
                const fileExt = file.name.split('.').pop();
                const fileName = `${user.id}/${key}_${Date.now()}.${fileExt}`;
                
                const { data, error } = await supabase.storage
                    .from('documents')
                    .upload(fileName, processedFile);

                if (error) {
                    console.error(`Upload error for ${key}:`, error);
                    throw new Error(`Failed to upload ${key}: ${error.message}`);
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('documents')
                    .getPublicUrl(fileName);

                return [key, publicUrl];
            } catch (error) {
                console.error(`Error processing ${key}:`, error);
                throw error;
            }
        });

        const results = await Promise.all(uploadPromises);
        return Object.fromEntries(results);
    }

    function setLoading(isLoading) {
        submitBtn.disabled = isLoading;
        submitBtn.classList.toggle('loading', isLoading);
        
        // Prevent form resubmission
        if (isLoading) {
            form.style.pointerEvents = 'none';
        } else {
            form.style.pointerEvents = '';
        }
        
        // Add visual feedback
        if (isLoading) {
            submitBtn.style.opacity = '0.8';
            submitBtn.style.cursor = 'not-allowed';
            submitBtn.style.transform = 'scale(0.98)';
            submitBtn.style.pointerEvents = 'none';
            submitBtn.style.background = 'linear-gradient(135deg, #cc5529 0%, #cc6b42 100%)';
        } else {
            submitBtn.style.opacity = '';
            submitBtn.style.cursor = '';
            submitBtn.style.transform = '';
            submitBtn.style.pointerEvents = '';
            submitBtn.style.background = '';
        }
        
        const btnText = submitBtn.querySelector('.btn-text');
        if (btnText) {
            if (isLoading) {
                btnText.textContent = 'Processing Files...';
            } else {
                // Use translation if available, otherwise fallback to English
                const translations = window.appTranslations?.translations;
                const currentLang = window.appTranslations?.getLanguage() || 'en';
                btnText.textContent = translations?.[currentLang]?.completeRegistration || 'Complete Registration';
            }
        }
    }
});