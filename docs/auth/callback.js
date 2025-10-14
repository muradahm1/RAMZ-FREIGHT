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

    statusEl.textContent = 'Authentication successful — redirecting...';

    // Decide where to redirect the user after successful login
    const basePath = getAppBasePath();
    // If the app stored an intended redirect in localStorage earlier, use it
    const intended = localStorage.getItem('post_auth_redirect');
    const destination = intended || (window.location.origin + basePath + '/docs/homepage/homepage.html');

    // Clean up URL in case anything remains
    try { history.replaceState({}, '', destination); } catch (e) {}

    // Give user a short moment to read then redirect
    setTimeout(() => { window.location.href = destination; }, 700);

  } catch (err) {
    statusEl.textContent = 'Unexpected error during authentication.';
    debugEl.textContent = err.message || String(err);
  }
}

handleCallback();
