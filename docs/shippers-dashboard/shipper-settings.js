import { supabase, supabaseReady } from '../assets/supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    await supabaseReady;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '../shippers-login/shippers-login.html';
        return;
    }

    loadProfile(session.user);

    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveProfile();
    });

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        if (confirm('Are you sure you want to logout?')) {
            await supabase.auth.signOut();
            window.location.href = '../shippers-login/shippers-login.html';
        }
    });
});

function loadProfile(user) {
    document.getElementById('fullName').value = user.user_metadata?.full_name || '';
    document.getElementById('email').value = user.email;
    document.getElementById('phone').value = user.user_metadata?.phone || '';
    document.getElementById('companyName').value = user.user_metadata?.company_name || '';
}

async function saveProfile() {
    try {
        const { error } = await supabase.auth.updateUser({
            data: {
                full_name: document.getElementById('fullName').value,
                phone: document.getElementById('phone').value,
                company_name: document.getElementById('companyName').value
            }
        });

        if (error) throw error;
        alert('Profile updated successfully!');
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile: ' + error.message);
    }
}
