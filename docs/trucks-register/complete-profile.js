import { supabase } from '../assets/supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    const nextBtn = document.getElementById('nextToStep2');
    const prevBtn = document.getElementById('backToStep1');
    const submitBtn = document.getElementById('submitProfile');
    const form = document.getElementById('completeProfileForm');

    // Step navigation
    nextBtn.addEventListener('click', () => {
        if (validateStep1()) {
            showStep(2);
        }
    });

    prevBtn.addEventListener('click', () => {
        showStep(1);
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (validateStep2()) {
            await submitProfile();
        }
    });

    // File upload handlers
    setupFileUploads();

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
        fields.forEach(field => {
            const input = document.getElementById(field.id);
            const errorEl = document.getElementById(field.error);
            
            if (!input.value.trim()) {
                errorEl.textContent = field.message;
                isValid = false;
            } else {
                errorEl.textContent = '';
            }
        });

        return isValid;
    }

    function validateStep2() {
        // Files are optional, just clear any errors
        const fileIds = ['idFront', 'idBack', 'drivingLicenseFront', 'drivingLicenseBack', 'carPhoto', 'carLicense'];
        fileIds.forEach(id => {
            const errorEl = document.getElementById(id.replace(/([A-Z])/g, '-$1').toLowerCase() + '-error');
            if (errorEl) errorEl.textContent = '';
        });
        return true;
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
        setLoading(true);
        
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session || !session.user) {
                throw new Error('User not authenticated');
            }
            const user = session.user;

            // Upload files if provided
            const fileUrls = await uploadFiles();

            // Generate truck number
            const truckNumber = 'TRK-' + Date.now().toString().slice(-6);

            // Save vehicle data to database
            const vehicleData = {
                user_id: user.id,
                vehicle_type: document.getElementById('carType').value,
                license_plate: document.getElementById('plateNumber').value,
                vehicle_model: document.getElementById('vehicleModel').value,
                vehicle_year: parseInt(document.getElementById('vehicleYear').value),
                max_load_capacity: parseInt(document.getElementById('maxLoad').value),
                status: 'pending_approval'
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

            alert('Profile completed successfully! Please wait for approval.');
            window.location.href = '../trucks-dashboard-cheak/truck-dashboard.html';

        } catch (error) {
            console.error('Error submitting profile:', error);
            alert('Failed to complete profile: ' + error.message);
        } finally {
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
        
        const uploadPromises = Object.entries(fileInputs).map(async ([key, file]) => {
            if (!file) return [key, null];

            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${key}_${Date.now()}.${fileExt}`;
            
            const { data, error } = await supabase.storage
                .from('documents')
                .upload(fileName, file);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('documents')
                .getPublicUrl(fileName);

            return [key, publicUrl];
        });

        const results = await Promise.all(uploadPromises);
        return Object.fromEntries(results);
    }

    function setLoading(isLoading) {
        submitBtn.disabled = isLoading;
        submitBtn.classList.toggle('loading', isLoading);
    }
});