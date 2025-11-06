-- SECURE RLS POLICIES FOR SHIPMENTS
-- This removes the overly permissive anon role access
-- Run this in Supabase SQL Editor

BEGIN;

-- Drop ALL existing policies (including any that might exist)
DROP POLICY IF EXISTS "shipments_insert_policy" ON shipments;
DROP POLICY IF EXISTS "shipments_select_policy" ON shipments;
DROP POLICY IF EXISTS "shipments_update_policy" ON shipments;
DROP POLICY IF EXISTS "shipments_insert_authenticated" ON shipments;
DROP POLICY IF EXISTS "shipments_select_role_based" ON shipments;
DROP POLICY IF EXISTS "shipments_update_assigned_owner" ON shipments;
DROP POLICY IF EXISTS "shipments_accept_pending" ON shipments;

-- Ensure RLS is enabled
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- Policy 1: INSERT - Only authenticated users can create shipments
CREATE POLICY "shipments_insert_authenticated"
ON shipments
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be the shipper creating the shipment
  auth.uid() = shipper_id
);

-- Policy 2: SELECT - Role-based viewing
CREATE POLICY "shipments_select_role_based"
ON shipments
FOR SELECT
TO authenticated
USING (
  -- Shippers see ALL their own shipments (any status)
  auth.uid() = shipper_id
  OR
  -- Truck owners see: pending unassigned OR assigned to them (any status)
  (status = 'pending' AND truck_owner_id IS NULL)
  OR
  auth.uid() = truck_owner_id
);

-- Policy 3: UPDATE - Only assigned truck owners can update their shipments
CREATE POLICY "shipments_update_assigned_owner"
ON shipments
FOR UPDATE
TO authenticated
USING (
  -- Can update if assigned to this truck owner
  auth.uid() = truck_owner_id
)
WITH CHECK (
  -- Truck owner ID must remain the same (can't reassign)
  truck_owner_id = auth.uid()
);

-- Policy 4: UPDATE - Allow accepting pending shipments (assignment)
CREATE POLICY "shipments_accept_pending"
ON shipments
FOR UPDATE
TO authenticated
USING (
  -- Can accept if pending and unassigned
  status = 'pending' AND truck_owner_id IS NULL
)
WITH CHECK (
  -- After acceptance, must be assigned to current user
  truck_owner_id = auth.uid() AND status = 'accepted'
);

COMMIT;

-- Verify policies
SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'shipments'
ORDER BY policyname;
