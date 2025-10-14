Quick OAuth setup for RAMZ-FREIGHT

1) Google Console — Authorized JavaScript origins
- https://muradahm1.github.io
- https://ramz-freight.onrender.com
- (optional) http://localhost:5500

2) Google Console — Authorized redirect URIs (copy/paste exact)
- https://sgmcuwmqmgchvnncbarb.supabase.co/auth/v1/callback
- https://muradahm1.github.io/RAMZ-FREIGHT/auth/callback.html
- https://muradahm1.github.io/RAMZ-FREIGHT/docs/trucks-dashboard-cheak/truck-dashboard.html
- https://muradahm1.github.io/RAMZ-FREIGHT/docs/trucks-register/complete-profile.html
- https://muradahm1.github.io/RAMZ-FREIGHT/docs/shippers-dashboard/shippers-dashboard.html
- https://muradahm1.github.io/RAMZ-FREIGHT/docs/shippers-register/registration-success.html
- https://ramz-freight.onrender.com/auth/callback.html
- https://ramz-freight.onrender.com/docs/trucks-dashboard-cheak/truck-dashboard.html
- https://ramz-freight.onrender.com/docs/trucks-register/complete-profile.html
- https://ramz-freight.onrender.com/docs/shippers-dashboard/shippers-dashboard.html
- (optional local)
  - http://localhost:5500/auth/callback.html
  - http://localhost:5500/docs/trucks-dashboard-cheak/truck-dashboard.html

3) Supabase
- Auth → Settings → External OAuth Providers → Google: paste Client ID & Client Secret
- Add the same redirect URIs to Supabase Auth settings if the dashboard requires them.

4) Notes
- Ensure Client Secret is only stored in Supabase dashboard (not in repo)
- Use incognito window to test after deploying updated JS to GitHub Pages or Render
- If you see redirect_uri_mismatch, copy the `redirect_uri` param shown in the failing network request and add that exact value to Google Console

5) Post-login behavior
- The app sets `localStorage.post_auth_redirect` before starting OAuth; `docs/auth/callback.js` reads the session and redirects back to that stored URL (or homepage).