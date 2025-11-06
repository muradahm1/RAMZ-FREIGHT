import { supabase } from '../assets/supabaseClient.js';

document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('errorMsg');
    const btn = e.target.querySelector('button');
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    errorMsg.textContent = '';
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error) throw error;
        
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('user_role')
            .eq('id', data.user.id)
            .single();
        
        if (profileError || !profile) throw new Error('Profile not found');
        
        if (!['admin', 'management', 'manager'].includes(profile.user_role)) {
            await supabase.auth.signOut();
            throw new Error('Access denied: Admin privileges required');
        }
        
        window.location.replace('../management/management.html');
    } catch (err) {
        errorMsg.textContent = err.message;
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
    }
});
