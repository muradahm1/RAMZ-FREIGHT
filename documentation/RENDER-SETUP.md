# Render Backend Setup - Fix Shipment Acceptance

## Problem
Backend is using anon key which respects RLS policies. For shipment assignment, we need service role key to bypass RLS.

## Solution: Add Service Role Key to Render

### Step 1: Get Your Service Role Key from Supabase

1. Go to https://supabase.com
2. Select your project
3. Click **Settings** (gear icon) in left sidebar
4. Click **API**
5. Scroll down to **Project API keys**
6. Copy the **`service_role`** key (NOT the anon key!)
   - It starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - ⚠️ **IMPORTANT:** This is a secret key - never commit it to GitHub!

### Step 2: Add Environment Variable in Render

1. Go to https://dashboard.render.com
2. Select your backend service
3. Click **Environment** in the left sidebar
4. Click **Add Environment Variable**
5. Add this variable:
   ```
   Key: SUPABASE_SERVICE_KEY
   Value: [paste your service_role key here]
   ```
6. Click **Save Changes**

### Step 3: Redeploy Backend

Render will automatically redeploy when you save environment variables.

If not, manually trigger a deploy:
1. Go to **Manual Deploy** section
2. Click **Deploy latest commit**

### Step 4: Verify It's Working

1. Wait for deployment to complete (check logs)
2. Test shipment acceptance:
   - Login as truck owner
   - Click "Place Bid" on a shipment
   - Check Supabase - status should change to `accepted`

## Environment Variables Checklist

Make sure these are set in Render:

- ✅ `SUPABASE_URL` - Your Supabase project URL
- ✅ `SUPABASE_KEY` - Your anon/public key
- ✅ `SUPABASE_SERVICE_KEY` - Your service role key (NEW!)
- ✅ `PORT` - 4000 (or whatever port you use)

## What Changed in Code

The backend now uses two Supabase clients:

```javascript
// For general operations (respects RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// For admin operations (bypasses RLS)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
```

The `/shipments/:id/assign` endpoint now uses `supabaseAdmin` to bypass RLS policies.

## Security Note

The service role key bypasses ALL RLS policies, so:
- ✅ Only use it in backend (never in frontend)
- ✅ Keep it in environment variables (never in code)
- ✅ Only use it for specific admin operations
- ✅ The backend still validates user authentication before allowing operations

## Troubleshooting

### If it still doesn't work:

1. **Check Render logs:**
   ```
   Dashboard → Your Service → Logs
   ```
   Look for errors when accepting shipments

2. **Verify environment variable is set:**
   ```
   Dashboard → Your Service → Environment
   ```
   Make sure `SUPABASE_SERVICE_KEY` is there

3. **Check if service key is correct:**
   - Go to Supabase → Settings → API
   - Copy the service_role key again
   - Update in Render

4. **Force redeploy:**
   ```
   Dashboard → Your Service → Manual Deploy → Deploy latest commit
   ```
