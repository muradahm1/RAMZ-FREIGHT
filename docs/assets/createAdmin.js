import { supabase } from './supabaseClient.js';

// Simple admin creation utility
// Run this in browser console to create an admin user

export async function createAdminUser(email, password) {
  try {
    // Sign up the user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          role: 'admin',
          full_name: 'System Administrator'
        }
      }
    });

    if (signUpError) {
      console.error('Error creating admin user:', signUpError);
      return false;
    }

    console.log('Admin user created successfully:', authData.user?.email);
    return true;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

// Usage: 
// import { createAdminUser } from './assets/createAdmin.js';
// createAdminUser('admin@ramzfreight.com', 'admin123456');