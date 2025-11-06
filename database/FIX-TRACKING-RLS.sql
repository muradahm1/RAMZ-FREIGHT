-- Fix RLS for shipment_tracking table to allow shippers to view tracking data
-- Run this in Supabase SQL Editor AFTER running the shipments RLS policy

BEGIN;

-- Enable RLS on shipment_tracking if not already enabled
ALTER TABLE shipment_tracking ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "tracking_select_policy" ON shipment_tracking;
DROP POLICY IF EXISTS "tracking_insert_policy" ON shipment_tracking;
DROP POLICY IF EXISTS "tracking_insert_owner" ON shipment_tracking;
DROP POLICY IF EXISTS "tracking_select_authorized" ON shipment_tracking;

-- Policy 1: Allow truck owners to insert tracking data for their shipments
CREATE POLICY "tracking_insert_owner"
ON shipment_tracking
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM shipments
    WHERE shipments.id = shipment_tracking.shipment_id
    AND shipments.truck_owner_id = (SELECT auth.uid())
  )
);

-- Policy 2: Allow shippers and truck owners to view tracking data
CREATE POLICY "tracking_select_authorized"
ON shipment_tracking
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM shipments
    WHERE shipments.id = shipment_tracking.shipment_id
    AND ((SELECT auth.uid()) = shipments.shipper_id OR (SELECT auth.uid()) = shipments.truck_owner_id)
  )
);

COMMIT;

-- Verify policies
SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'shipment_tracking'
ORDER BY policyname;
