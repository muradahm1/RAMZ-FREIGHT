# Fix: Shipment Acceptance Issue

## Problem
Truck owners can place bids and see "Load accepted successfully!" message, but:
- Shipment status remains `pending` in Supabase
- Shipment doesn't appear in "My Accepted Shipments"
- Database update is not happening

## Root Cause
**RLS (Row Level Security) Policy Blocking Updates**

The RLS policy only allowed truck owners to update shipments where `truck_owner_id = auth.uid()`. However, when accepting a pending shipment, the `truck_owner_id` is NULL, so the policy blocks the update.

## Solution

### Step 1: Update RLS Policy in Supabase

Run this SQL in your Supabase SQL Editor:

```sql
-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Truck owners update assigned shipments" ON shipments;

-- Create new policy that allows updates on pending shipments
CREATE POLICY "Truck owners update shipments"
ON shipments
FOR UPDATE
TO authenticated
USING (
  status = 'pending' OR 
  auth.uid() = truck_owner_id
)
WITH CHECK (
  auth.uid() = truck_owner_id
);
```

This allows truck owners to:
1. Update pending shipments (to accept them)
2. Update shipments already assigned to them

### Step 2: Verify Backend Endpoint

The backend endpoint `/shipments/:id/assign` is correct:

```javascript
// Updates truck_owner_id and status
await supabase.from('shipments')
  .update({ 
    truck_owner_id: user.id, 
    status: 'accepted' 
  })
  .eq('id', shipmentId)
```

### Step 3: Test the Fix

1. **Run the SQL** in Supabase SQL Editor
2. **Refresh your app** (clear cache if needed)
3. **Test acceptance flow:**
   - Login as truck owner
   - Click "Place Bid" on a pending shipment
   - Confirm acceptance
   - Check Supabase: status should be `accepted`, `truck_owner_id` should be set
   - Check "My Accepted Shipments": shipment should appear

### Step 4: Verify Query in "My Accepted Shipments"

The query correctly filters by:
```javascript
shipments.filter(s => 
  String(s.truck_owner_id) === String(user.id) && 
  ['accepted','in_transit'].includes(s.status)
)
```

## Quick Fix Script

Run this complete SQL to fix all RLS policies:

```sql
-- Complete RLS Fix for Shipments
BEGIN;

-- Drop all existing policies
DROP POLICY IF EXISTS "Authenticated can insert shipments" ON shipments;
DROP POLICY IF EXISTS "View own shipments as shipper" ON shipments;
DROP POLICY IF EXISTS "Truck owners view available shipments" ON shipments;
DROP POLICY IF EXISTS "Truck owners update assigned shipments" ON shipments;
DROP POLICY IF EXISTS "Truck owners update shipments" ON shipments;
DROP POLICY IF EXISTS "Admins view all shipments" ON shipments;

-- Enable RLS
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- INSERT: Authenticated users can create shipments
CREATE POLICY "Authenticated can insert shipments"
ON shipments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = shipper_id);

-- SELECT: Shippers see their own
CREATE POLICY "View own shipments as shipper"
ON shipments FOR SELECT TO authenticated
USING (auth.uid() = shipper_id);

-- SELECT: Truck owners see pending or assigned to them
CREATE POLICY "Truck owners view available shipments"
ON shipments FOR SELECT TO authenticated
USING (status = 'pending' OR auth.uid() = truck_owner_id);

-- UPDATE: Truck owners can accept pending or update their shipments
CREATE POLICY "Truck owners update shipments"
ON shipments FOR UPDATE TO authenticated
USING (status = 'pending' OR auth.uid() = truck_owner_id)
WITH CHECK (auth.uid() = truck_owner_id);

COMMIT;
```

## Testing Checklist

- [ ] Run SQL in Supabase SQL Editor
- [ ] Clear browser cache
- [ ] Login as truck owner
- [ ] View available loads (should see pending shipments)
- [ ] Click "Place Bid" on a shipment
- [ ] Confirm acceptance
- [ ] Verify success message appears
- [ ] Check Supabase shipments table:
  - [ ] `status` = 'accepted'
  - [ ] `truck_owner_id` = your user ID
- [ ] Refresh "My Accepted Shipments" page
- [ ] Verify shipment appears in accepted list
- [ ] Click "Start Shipment" to test status change to 'in_transit'

## Additional Notes

- The backend uses service role credentials, so it bypasses RLS
- However, the Supabase client in frontend uses user tokens, so RLS applies
- The fix ensures RLS allows the necessary operations
- No frontend code changes needed - only database policy update
