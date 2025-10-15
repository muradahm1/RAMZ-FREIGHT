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

    // Get the authenticated user (SDK should have stored the session)
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user || data?.session?.user || null;

    // Try to determine role: first from user_metadata (if signUp stored it),
    // then from a profiles table (common pattern). Adjust to your schema.
    let role = user?.user_metadata?.user_role;

    if (!role && user?.id) {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_role')
          .eq('id', user.id)
          .maybeSingle();
        if (profile && profile.user_role) role = profile.user_role;
        if (profileError) console.warn('Profile lookup error:', profileError.message || profileError);
      } catch (e) {
        console.warn('Error querying profiles table:', e.message || e);
      }
    }

    // Decide destination based on role
    let destination = null;
    if (role === 'truck_owner' || role === 'truck') {
      destination = getAppBasePath() ? (window.location.origin + getAppBasePath() + '/docs/trucks-dashboard-cheak/truck-dashboard.html') : (window.location.origin + '/docs/trucks-dashboard-cheak/truck-dashboard.html');
    } else if (role === 'shipper' || role === 'shipper_user') {
      destination = getAppBasePath() ? (window.location.origin + getAppBasePath() + '/docs/shippers-dashboard/shippers-dashboard.html') : (window.location.origin + '/docs/shippers-dashboard/shippers-dashboard.html');
    }

    // If no role found, fall back to any stored intended redirect or the homepage
    const intended = localStorage.getItem('post_auth_redirect');
    if (!destination) destination = intended || (window.location.origin + getAppBasePath() + '/docs/homepage/homepage.html');

    statusEl.textContent = 'Redirecting you now...';
    try { history.replaceState({}, '', destination); } catch (e) {}
    setTimeout(() => { window.location.href = destination; }, 700);

  } catch (err) {
    statusEl.textContent = 'Unexpected error during authentication.';
    debugEl.textContent = err.message || String(err);
  }
}

handleCallback();
