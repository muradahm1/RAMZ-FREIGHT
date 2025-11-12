import { supabase, supabaseReady } from '../assets/supabaseClient.js';

function getAppBasePath() {
  const parts = (window.location.pathname || '/').split('/');
  if (parts.length > 1 && parts[1]) return '/' + parts[1];
  return '';
}

async function handleCallback() {
  try {
    await supabaseReady;
    
    // Get current session after OAuth
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      window.location.href = '../homepage/homepage.html';
      return;
    }

    const expectedRole = localStorage.getItem('expectedRole');
    localStorage.removeItem('expectedRole');
    
    const basePath = getAppBasePath();
    const origin = window.location.origin;
    const user = session.user;
    const currentRole = user.user_metadata?.user_role;

    // Set role for new users
    if (!currentRole && expectedRole) {
      await supabase.auth.updateUser({
        data: { user_role: expectedRole }
      });
    }

    // Check role conflicts
    if (currentRole && expectedRole && currentRole !== expectedRole) {
      await supabase.auth.signOut();
      const errorMsg = currentRole === 'shipper' 
        ? 'This Google account is registered as a Shipper. Please use Shipper login.'
        : 'This Google account is registered as a Truck Owner. Please use Truck Owner login.';
      
      const redirectPath = expectedRole === 'shipper'
        ? `${origin}${basePath}/docs/shippers-login/shippers-login.html`
        : `${origin}${basePath}/docs/trucks-login/trucks-login.html`;
      
      window.location.href = `${redirectPath}?error=${encodeURIComponent(errorMsg)}`;
      return;
    }

    // Redirect to appropriate dashboard
    let destination;
    const finalRole = currentRole || expectedRole;
    
    if (finalRole === 'truck_owner' || finalRole === 'truck') {
      destination = `${origin}${basePath}/docs/trucks-dashboard-cheak/truck-dashboard.html`;
    } else {
      destination = `${origin}${basePath}/docs/shippers-dashboard/shippers-dashboard.html`;
    }

    window.location.href = destination;

  } catch (err) {
    console.error('OAuth callback error:', err);
    window.location.href = '../homepage/homepage.html';
  }
}

handleCallback();
