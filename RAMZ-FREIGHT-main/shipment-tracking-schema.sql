-- Create shipment_tracking table
CREATE TABLE IF NOT EXISTS shipment_tracking (
    id BIGSERIAL PRIMARY KEY,
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed DOUBLE PRECISION DEFAULT 0,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_shipment_tracking_shipment_id ON shipment_tracking(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_tracking_timestamp ON shipment_tracking(timestamp DESC);

-- Enable RLS
ALTER TABLE shipment_tracking ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated users to insert tracking" ON shipment_tracking;
DROP POLICY IF EXISTS "Allow authenticated users to select tracking" ON shipment_tracking;

-- Insert policy: authenticated users can insert their own tracking data
CREATE POLICY "Allow authenticated users to insert tracking"
ON shipment_tracking
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM shipments s
        WHERE s.id = shipment_tracking.shipment_id
        AND s.truck_owner_id = auth.uid()
    )
);

-- Select policy: users can view tracking for their shipments
CREATE POLICY "Allow authenticated users to select tracking"
ON shipment_tracking
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM shipments s
        WHERE s.id = shipment_tracking.shipment_id
        AND (s.shipper_id = auth.uid() OR s.truck_owner_id = auth.uid())
    )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE shipment_tracking;

-- Verify tables exist and show their structure
DO $$
BEGIN
    -- Check shipments table
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shipments') THEN
        RAISE NOTICE 'shipments table exists';
    ELSE
        RAISE EXCEPTION 'shipments table does not exist!';
    END IF;
    
    -- Check truck_owners table
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'truck_owners') THEN
        RAISE NOTICE 'truck_owners table exists';
    END IF;
    
    -- Check vehicles table
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vehicles') THEN
        RAISE NOTICE 'vehicles table exists';
    END IF;
END $$;
