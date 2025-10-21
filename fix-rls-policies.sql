-- Fix RLS Policies for Shipments Table
-- Run this in Supabase SQL Editor

-- Drop existing policies if any
DROP POLICY IF EXISTS "Shippers can insert their own shipments" ON shipments;
DROP POLICY IF EXISTS "Shippers can view their own shipments" ON shipments;
DROP POLICY IF EXISTS "Truck owners can view pending and assigned shipments" ON shipments;
DROP POLICY IF EXISTS "Truck owners can update assigned shipments" ON shipments;
DROP POLICY IF EXISTS "Admins can view all shipments" ON shipments;

-- Enable RLS on shipments table
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- Policy: Shippers can insert their own shipments
CREATE POLICY "Shippers can insert their own shipments"
ON shipments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = shipper_id);

-- Policy: Shippers can view their own shipments
CREATE POLICY "Shippers can view their own shipments"
ON shipments
FOR SELECT
TO authenticated
USING (auth.uid() = shipper_id);

-- Policy: Truck owners can view pending shipments or their assigned shipments
CREATE POLICY "Truck owners can view available shipments"
ON shipments
FOR SELECT
TO authenticated
USING (
  status = 'pending' OR 
  auth.uid() = truck_owner_id
);

-- Policy: Truck owners can update shipments assigned to them
CREATE POLICY "Truck owners can update assigned shipments"
ON shipments
FOR UPDATE
TO authenticated
USING (auth.uid() = truck_owner_id)
WITH CHECK (auth.uid() = truck_owner_id);

-- Policy: Allow service role (backend) to do everything
CREATE POLICY "Service role has full access"
ON shipments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Admins/Management can view all shipments
CREATE POLICY "Admins can view all shipments"
ON shipments
FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'user_role') IN ('admin', 'manager', 'management')
);
