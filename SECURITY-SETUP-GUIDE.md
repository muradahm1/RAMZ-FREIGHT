# Security Setup Guide - Step by Step

## Step 1: Apply Secure RLS Policies ✅

### Instructions:
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `sgmcuwmqmgchvnncbarb`
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the entire contents of `database/SECURE-RLS-FIX.sql`
6. Click **Run** button (or press Ctrl+Enter)
7. You should see "Success. No rows returned" message
8. Scroll down to see the policy verification results

### Expected Result:
You should see 4 policies listed:
- `shipments_accept_pending`
- `shipments_insert_authenticated`
- `shipments_select_role_based`
- `shipments_update_assigned_owner`

---

## Step 2: Rotate Supabase Keys (Keys Were Exposed) 🔑

### Why?
Your Supabase anon key was hardcoded in the GitHub repository, meaning anyone could see it. We need to generate a new key.

### Instructions:

#### A. Get New Anon Key:
1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **Settings** (gear icon) in the left sidebar
4. Click **API** under Project Settings
5. Scroll to **Project API keys** section
6. Find the **anon public** key
7. Click the **eye icon** to reveal it
8. Click **Copy** to copy the key
9. **Save this key** - you'll need it in Step 3

#### B. Optional - Reset the Key (Recommended):
If you want to invalidate the old exposed key:
1. In the same API settings page
2. Find **anon public** key
3. Click the **refresh/rotate icon** next to it
4. Confirm the rotation
5. Copy the NEW key that appears
6. **Important**: The old key will stop working immediately

---

## Step 3: Update Render Environment Variables 🚀

### Instructions:

#### A. Go to Render Dashboard:
1. Open https://dashboard.render.com
2. Find your backend service: `ramz-freight`
3. Click on it to open

#### B. Update Environment Variables:
1. Click **Environment** in the left sidebar
2. You should see existing variables. Update/add these:

**Required Variables:**

| Key | Value | Where to Get It |
|-----|-------|----------------|
| `SUPABASE_URL` | `https://sgmcuwmqmgchvnncbarb.supabase.co` | Already set (don't change) |
| `SUPABASE_KEY` | `eyJhbGc...` (your NEW anon key) | From Step 2 above |
| `SUPABASE_SERVICE_KEY` | `eyJhbGc...` (service role key) | See below ⬇️ |
| `NODE_ENV` | `production` | Type manually |
| `ALLOWED_ORIGINS` | `https://muradahm1.github.io` | Type manually |

**How to Get Service Role Key:**
1. Go back to Supabase Dashboard → Settings → API
2. Scroll to **Project API keys**
3. Find **service_role** key (⚠️ Keep this SECRET!)
4. Click eye icon to reveal
5. Copy and paste into Render

#### C. Save and Deploy:
1. Click **Save Changes** button at the top
2. Render will automatically redeploy your backend
3. Wait 2-3 minutes for deployment to complete
4. Check the **Logs** tab to ensure no errors

---

## Step 4: Verify Everything Works ✅

### Test Your Application:

1. **Open your app**: https://muradahm1.github.io/RAMZ-FREIGHT/docs/homepage/homepage.html

2. **Test Shipper Flow**:
   - Login as shipper
   - Create a new shipment
   - Should work without errors

3. **Test Truck Owner Flow**:
   - Login as truck owner
   - View available loads (should see pending shipments)
   - Accept a shipment
   - Should appear in "My Accepted Shipments"

4. **Check Backend Logs**:
   - Go to Render Dashboard → Your Service → Logs
   - Should NOT see any errors about missing environment variables
   - Should see: "Server running on http://localhost:4000"

---

## Troubleshooting 🔧

### Error: "Missing required environment variables"
**Solution**: Go back to Step 3 and ensure all 5 variables are set in Render

### Error: "Failed to fetch loads"
**Solution**: 
1. Check Render logs for errors
2. Verify SUPABASE_SERVICE_KEY is correct
3. Make sure you ran the SQL from Step 1

### Error: "CORS policy blocked"
**Solution**: 
1. Verify `ALLOWED_ORIGINS` includes your GitHub Pages URL
2. Make sure there are no typos in the URL

### Shipments not showing
**Solution**:
1. Run Step 1 SQL again (it's safe to run multiple times)
2. Clear browser cache (Ctrl+Shift+Delete)
3. Logout and login again

---

## Security Checklist ✓

After completing all steps, verify:

- [ ] Secure RLS policies applied (Step 1)
- [ ] New Supabase anon key generated (Step 2)
- [ ] All 5 environment variables set in Render (Step 3)
- [ ] Backend deployed successfully
- [ ] Can create shipments as shipper
- [ ] Can accept shipments as truck owner
- [ ] No console errors in browser
- [ ] No errors in Render logs

---

## Important Notes 📝

1. **Never share your Service Role Key** - It has full database access
2. **Keep environment variables secret** - Don't commit them to GitHub
3. **The old anon key is now invalid** - If you rotated it in Step 2
4. **CORS is now restricted** - Only your GitHub Pages domain can access the API

---

## Need Help?

If you encounter issues:
1. Check Render logs: Dashboard → Service → Logs
2. Check browser console: Press F12 → Console tab
3. Verify all environment variables are set correctly
4. Make sure SQL policies were applied successfully
