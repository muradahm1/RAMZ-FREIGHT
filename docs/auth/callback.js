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

    // The user role should have been stored in localStorage before the OAuth redirect.
    const role = localStorage.getItem('userRole');
    localStorage.removeItem('userRole'); // Clean up after use

    // Check for role conflicts
    if (role && data.session?.user) {
      const currentRole = data.session.user.user_metadata?.user_role;
      
      // If user already has a different role, prevent access
      if (currentRole && currentRole !== role) {
        await supabase.auth.signOut();
        const errorMsg = currentRole === 'shipper' 
          ? 'This account is registered as a Shipper. Please use the Shipper login or create a new Truck Owner account.'
          : 'This account is registered as a Truck Owner. Please use the Truck Owner login or create a new Shipper account.';
        
        const redirectUrl = currentRole === 'shipper'
          ? `${origin}${basePath}/docs/shippers-login/shippers-login.html?error=${encodeURIComponent(errorMsg)}`
          : `${origin}${basePath}/docs/trucks-login/trucks-login.html?error=${encodeURIComponent(errorMsg)}`;
        
        window.location.href = redirectUrl;
        return;
      }
      
      // Set role if not already set
      if (!currentRole) {
        try {
          await supabase.auth.updateUser({
            data: { user_role: role }
          });
        } catch (updateError) {
          console.error('Failed to update user role:', updateError);
        }
      }
    }

    // Also check for a specific post-auth redirect path.
    const intendedPath = localStorage.getItem('post_auth_redirect');
    localStorage.removeItem('post_auth_redirect');

    // Decide destination based on role
    let destination = null;
    const basePath = getAppBasePath();
    const origin = window.location.origin;

    if (role === 'truck_owner') {
      destination = `${origin}${basePath}/docs/trucks-dashboard-cheak/truck-dashboard.html`;
    } else if (role === 'shipper') {
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
