import { supabase, supabaseReady } from '../assets/supabaseClient.js';

function getAppBasePath() {
  const parts = (window.location.pathname || '/').split('/');
  if (parts.length > 1 && parts[1]) return '/' + parts[1];
  return '';
}

async function handleCallback() {
  const statusEl = document.getElementById('status');
  const debugEl = document.getElementById('debug');

  try {
    await supabaseReady;
  } catch (err) {
    statusEl.textContent = 'Failed to initialize authentication client.';
    debugEl.textContent = err.message || String(err);
    return;
  }

  // Supabase returns tokens in the URL fragment after the #
  try {
    // This call will parse the fragment and set the session client-side
    const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
    if (error) {
      statusEl.textContent = 'Authentication failed.';
      debugEl.textContent = error.message;
      return;
    }

    statusEl.textContent = 'Authentication successful — resolving account...';

    // The expected role should have been stored in localStorage before the OAuth redirect.
    const expectedRole = localStorage.getItem('expectedRole');
    localStorage.removeItem('expectedRole'); // Clean up after use

    const basePath = getAppBasePath();
    const origin = window.location.origin;

    // Check for role conflicts
    if (expectedRole && data.session?.user) {
      const user = data.session.user;
      const currentRole = user.user_metadata?.user_role;
      
      // If user already has a different role, prevent access
      if (currentRole && currentRole !== expectedRole) {
        await supabase.auth.signOut();
        
        let errorMsg, redirectPath;
        if (currentRole === 'shipper' || currentRole?.startsWith('shipper')) {
          errorMsg = 'This Google account is already registered as a Shipper. Please use the Shipper login or create a new Google account for Truck Owner access.';
          redirectPath = expectedRole === 'truck_owner' 
            ? `${origin}${basePath}/docs/trucks-login/trucks-login.html`
            : `${origin}${basePath}/docs/shippers-login/shippers-login.html`;
        } else if (currentRole === 'truck_owner' || currentRole === 'truck' || currentRole?.startsWith('truck')) {
          errorMsg = 'This Google account is already registered as a Truck Owner. Please use the Truck Owner login or create a new Google account for Shipper access.';
          redirectPath = expectedRole === 'shipper'
            ? `${origin}${basePath}/docs/shippers-login/shippers-login.html`
            : `${origin}${basePath}/docs/trucks-login/trucks-login.html`;
        } else {
          errorMsg = 'This account has an incompatible role. Please contact support.';
          redirectPath = `${origin}${basePath}/docs/homepage/homepage.html`;
        }
        
        window.location.href = `${redirectPath}?error=${encodeURIComponent(errorMsg)}`;
        return;
      }
      
      // For new users or users without a role, check for email conflicts
      if (!currentRole) {
        try {
          const { data: hasConflict, error: conflictError } = await supabase.rpc('check_user_role_conflict', {
            user_email: user.email,
            new_role: expectedRole
          });
          
          if (hasConflict) {
            await supabase.auth.signOut();
            const errorMsg = 'An account with this email already exists with a different role. Please use a different email or login with your existing account.';
            const redirectPath = expectedRole === 'shipper'
              ? `${origin}${basePath}/docs/shippers-login/shippers-login.html`
              : `${origin}${basePath}/docs/trucks-login/trucks-login.html`;
            
            window.location.href = `${redirectPath}?error=${encodeURIComponent(errorMsg)}`;
            return;
          }
          
          // Set role for new user
          await supabase.auth.updateUser({
            data: { user_role: expectedRole }
          });
        } catch (updateError) {
          console.error('Failed to update user role:', updateError);
          await supabase.auth.signOut();
          const errorMsg = 'Failed to set up your account. Please try again.';
          const redirectPath = expectedRole === 'shipper'
            ? `${origin}${basePath}/docs/shippers-login/shippers-login.html`
            : `${origin}${basePath}/docs/trucks-login/trucks-login.html`;
          
          window.location.href = `${redirectPath}?error=${encodeURIComponent(errorMsg)}`;
          return;
        }
      }
    }

    // Also check for a specific post-auth redirect path.
    const intendedPath = localStorage.getItem('post_auth_redirect');
    localStorage.removeItem('post_auth_redirect');

    // Decide destination based on role
    let destination = null;

    if (expectedRole === 'truck_owner') {
      // For truck owners, check if profile is completed
      try {
        const { data: vehicle } = await supabase
          .from('vehicles')
          .select('*')
          .eq('user_id', data.session.user.id)
          .single();
        
        destination = vehicle 
          ? `${origin}${basePath}/docs/trucks-dashboard-cheak/truck-dashboard.html`
          : `${origin}${basePath}/docs/trucks-register/complete-profile.html`;
      } catch (err) {
        destination = `${origin}${basePath}/docs/trucks-register/complete-profile.html`;
      }
    } else if (expectedRole === 'shipper') {
      destination = `${origin}${basePath}/docs/shippers-dashboard/shippers-dashboard.html`;
    }

    // Fallback to intended path or homepage if role-based destination fails
    if (!destination) destination = intendedPath || `${origin}${basePath}/docs/homepage/homepage.html`;

    statusEl.textContent = 'Redirecting you now...';
    try { history.replaceState({}, '', destination); } catch (e) {}
    setTimeout(() => { window.location.href = destination; }, 700);

  } catch (err) {
    statusEl.textContent = 'Unexpected error during authentication.';
    debugEl.textContent = err.message || String(err);
  }
}

handleCallback();
