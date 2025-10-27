-- QUICK FIX: Shipment Acceptance RLS Issue
-- Run this in Supabase SQL Editor to fix the truck owner acceptance problem

BEGIN;

-- Drop the restrictive policy that blocks acceptance
DROP POLICY IF EXISTS "Truck owners update assigned shipments" ON shipments;
DROP POLICY IF EXISTS "Truck owners update shipments" ON shipments;

-- Create new policy that allows truck owners to:
-- 1. Accept pending shipments (status = 'pending')
-- 2. Update their own assigned shipments (truck_owner_id = auth.uid())
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

COMMIT;

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'shipments' AND policyname = 'Truck owners update shipments';
