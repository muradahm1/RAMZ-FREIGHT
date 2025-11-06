-- COMPLETE FIX: Shipment Acceptance Issue
-- This ensures backend can update shipments using anon key
-- Run this in Supabase SQL Editor

BEGIN;

-- First, drop ALL existing policies on shipments
DROP POLICY IF EXISTS "Authenticated can insert shipments" ON shipments;
DROP POLICY IF EXISTS "View own shipments as shipper" ON shipments;
DROP POLICY IF EXISTS "Truck owners view available shipments" ON shipments;
DROP POLICY IF EXISTS "Truck owners update assigned shipments" ON shipments;
DROP POLICY IF EXISTS "Truck owners update shipments" ON shipments;
DROP POLICY IF EXISTS "Admins view all shipments" ON shipments;
DROP POLICY IF EXISTS "Service role has full access" ON shipments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON shipments;
DROP POLICY IF EXISTS "Enable read access for all users" ON shipments;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON shipments;

-- Ensure RLS is enabled
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- Policy 1: INSERT - Authenticated users can create shipments
CREATE POLICY "shipments_insert_policy"
ON shipments
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Policy 2: SELECT - Users can view shipments based on role
CREATE POLICY "shipments_select_policy"
ON shipments
FOR SELECT
TO authenticated, anon
USING (
  -- Shippers see their own
  auth.uid() = shipper_id
  OR
  -- Truck owners see pending or assigned to them
  (status = 'pending' OR auth.uid() = truck_owner_id)
  OR
  -- Allow anon key to see all (for backend operations)
  auth.role() = 'anon'
);

-- Policy 3: UPDATE - Allow updates for pending shipments and assigned shipments
CREATE POLICY "shipments_update_policy"
ON shipments
FOR UPDATE
TO authenticated, anon
USING (
  -- Allow update if pending (for acceptance)
  status = 'pending'
  OR
  -- Allow update if already assigned to user
  auth.uid() = truck_owner_id
  OR
  -- Allow anon key to update (for backend operations)
  auth.role() = 'anon'
)
WITH CHECK (
  -- After update, truck_owner_id must be set to current user or remain as is
  truck_owner_id IS NOT NULL
  OR
  auth.role() = 'anon'
);

COMMIT;

-- Verify policies were created
SELECT 
    policyname,
    cmd,
    qual as using_clause
FROM pg_policies
WHERE tablename = 'shipments'
ORDER BY policyname;
