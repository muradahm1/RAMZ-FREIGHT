-- CRITICAL: Run these commands in Supabase SQL Editor

-- Enable Row Level Security on all tables
ALTER TABLE IF EXISTS shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS shippers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS shipment_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ratings ENABLE ROW LEVEL SECURITY;

-- Shipments security policies
DROP POLICY IF EXISTS "shipments_policy" ON shipments;
CREATE POLICY "shipments_policy" ON shipments
FOR ALL USING (
  shipper_id = auth.uid() OR 
  truck_owner_id = auth.uid()
);

-- Shippers security policies
DROP POLICY IF EXISTS "shippers_policy" ON shippers;
CREATE POLICY "shippers_policy" ON shippers
FOR ALL USING (user_id = auth.uid());

-- Vehicles security policies
DROP POLICY IF EXISTS "vehicles_policy" ON vehicles;
CREATE POLICY "vehicles_policy" ON vehicles
FOR ALL USING (user_id = auth.uid());

-- Shipment tracking security policies
DROP POLICY IF EXISTS "tracking_policy" ON shipment_tracking;
CREATE POLICY "tracking_policy" ON shipment_tracking
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM shipments 
    WHERE shipments.id = shipment_tracking.shipment_id 
    AND (shipments.shipper_id = auth.uid() OR shipments.truck_owner_id = auth.uid())
  )
);

-- Ratings security policies
DROP POLICY IF EXISTS "ratings_policy" ON ratings;
CREATE POLICY "ratings_policy" ON ratings
FOR ALL USING (
  rater_id = auth.uid() OR 
  ratee_id = auth.uid()
);