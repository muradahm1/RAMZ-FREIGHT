# Fix Shipper Tracking Issues

## Problem
- Accepted shipments not showing in shipper's "Active Shipments"
- Live tracking page shows "Please select a shipment" even when shipments exist
- Truck location not visible on map

## Root Cause
RLS (Row Level Security) policies were blocking shippers from seeing their shipments after they were accepted by truck owners.

## Solution - Run These SQL Scripts

### Step 1: Update Shipments RLS Policy
Run this in Supabase SQL Editor:
```sql
database/SECURE-RLS-FIX.sql
```

This ensures shippers can see ALL their shipments regardless of status (pending, accepted, in_transit, delivered).

### Step 2: Add Tracking RLS Policies
Run this in Supabase SQL Editor:
```sql
database/FIX-TRACKING-RLS.sql
```

This allows:
- Shippers to view tracking data for their shipments
- Truck owners to insert tracking data for their assigned shipments

## How to Apply

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in left sidebar
4. Click **New Query**
5. Copy and paste contents of `database/SECURE-RLS-FIX.sql`
6. Click **Run** (Ctrl+Enter)
7. Wait for "Success" message
8. Repeat steps 4-7 for `database/FIX-TRACKING-RLS.sql`

## Verify It Works

### Test Active Shipments:
1. Login as shipper
2. Go to dashboard
3. You should see accepted shipments in "Active Shipments" section
4. Click on a shipment card
5. Should redirect to live tracking page

### Test Live Tracking:
1. On live tracking page
2. Dropdown should show accepted/in_transit shipments
3. Select a shipment
4. Map should show:
   - Green marker: Pickup location
   - Red marker: Destination
   - Orange truck icon: Current truck location (if tracking data exists)
   - Dashed line: Route from pickup to destination

### Test Real-Time Tracking:
1. Select a shipment that is "in_transit"
2. Click "Start Real-Time Tracking" button
3. Map should update every 3 seconds with truck's current location
4. Progress bar should show percentage complete
5. Distance and ETA should update

## What Changed

### Before:
- Shippers could only see "pending" shipments
- Once accepted, shipments disappeared from shipper's view
- Tracking data was blocked by RLS

### After:
- Shippers see ALL their shipments (pending, accepted, in_transit, delivered)
- Accepted shipments appear in "Active Shipments"
- Shippers can view tracking data for their shipments
- Live tracking works properly

## Troubleshooting

### Shipments still not showing:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Logout and login again
3. Check browser console (F12) for errors
4. Verify both SQL scripts ran successfully

### Tracking not working:
1. Ensure shipment status is "accepted" or "in_transit"
2. Check if truck owner has started tracking (marked as "in transit")
3. Verify shipment_tracking table has data for the shipment
4. Check browser console for errors

### "Please select a shipment" message:
1. Verify shipments exist with status "accepted" or "in_transit"
2. Check RLS policies were applied correctly
3. Ensure you're logged in as the correct shipper
4. Try refreshing the page

## Security Note

These RLS policies are secure because:
- Shippers can ONLY see their own shipments (where shipper_id = their user ID)
- Truck owners can ONLY see shipments assigned to them or pending unassigned ones
- Tracking data is ONLY visible to the shipper and assigned truck owner
- No user can see other users' data

## Need Help?

If issues persist:
1. Check Supabase logs: Dashboard → Logs
2. Check browser console: F12 → Console tab
3. Verify RLS policies: Dashboard → Table Editor → shipments → RLS tab
4. Ensure both SQL scripts completed without errors
