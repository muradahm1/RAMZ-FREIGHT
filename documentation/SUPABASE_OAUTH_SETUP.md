# Supabase OAuth Configuration for GitHub Pages

## CRITICAL: Configure Redirect URLs in Supabase

Your Google OAuth login works locally but not on GitHub Pages because Supabase needs to know which URLs are allowed for OAuth redirects.

### Steps to Fix:

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project: `sgmcuwmqmgchvnncbarb`

2. **Navigate to Authentication Settings**
   - Click on "Authentication" in the left sidebar
   - Click on "URL Configuration"

3. **Add GitHub Pages URLs**
   
   In the **"Redirect URLs"** section, add these URLs:
   
   ```
   https://muradahm1.github.io/RAMZ-FREIGHT/docs/shippers-dashboard/shippers-dashboard.html
   https://muradahm1.github.io/RAMZ-FREIGHT/docs/trucks-dashboard-cheak/truck-dashboard.html
   http://localhost:5500/docs/shippers-dashboard/shippers-dashboard.html
   http://localhost:5500/docs/trucks-dashboard-cheak/truck-dashboard.html
   ```

4. **Update Site URL**
   
   Set the **"Site URL"** to:
   ```
   https://muradahm1.github.io/RAMZ-FREIGHT/
   ```

5. **Save Changes**
   - Click "Save" at the bottom of the page
   - Wait 1-2 minutes for changes to propagate

### Why This is Needed:

- Supabase blocks OAuth redirects to unauthorized URLs for security
- GitHub Pages uses a different domain than localhost
- Without this configuration, Google login completes but can't redirect back to your app

### After Configuration:

1. Push the updated code to GitHub (already done ✓)
2. Wait for GitHub Pages to deploy (1-3 minutes)
3. Test Google login on your live site
4. Users should now be redirected to the dashboard after login

### Troubleshooting:

If it still doesn't work:
- Clear browser cache and cookies
- Check browser console for errors (F12)
- Verify the redirect URLs match exactly (case-sensitive)
- Make sure there are no trailing slashes where not needed
