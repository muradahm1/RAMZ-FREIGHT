-- Create ratings table
CREATE TABLE IF NOT EXISTS ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
    rater_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rated_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    rater_type TEXT CHECK (rater_type IN ('shipper', 'truck_owner')),
    UNIQUE(shipment_id, rater_id)
);

-- Enable RLS
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view ratings about themselves
CREATE POLICY "Users can view their ratings" ON ratings
    FOR SELECT USING (rated_id = auth.uid() OR rater_id = auth.uid());

-- Policy: Users can create ratings
CREATE POLICY "Users can create ratings" ON ratings
    FOR INSERT WITH CHECK (rater_id = auth.uid());

-- Add indexes
CREATE INDEX idx_ratings_rated_id ON ratings(rated_id);
CREATE INDEX idx_ratings_shipment_id ON ratings(shipment_id);

-- Add vehicle_id to shipments table
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES vehicles(id);

COMMENT ON COLUMN shipments.vehicle_id IS 'Vehicle assigned to this shipment';
