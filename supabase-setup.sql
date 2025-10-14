-- Drop existing tables if they exist
DROP TABLE IF EXISTS shipment_tracking CASCADE;
DROP TABLE IF EXISTS shipments CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS shippers CASCADE;

-- Create shippers table
CREATE TABLE shippers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  business_type TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create vehicles table
CREATE TABLE vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL,
  license_plate TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  vehicle_year INTEGER NOT NULL,
  max_load_capacity INTEGER NOT NULL,
  status TEXT DEFAULT 'pending_approval',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create shipments table
CREATE TABLE shipments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shipper_id UUID REFERENCES auth.users(id),
  truck_owner_id UUID REFERENCES auth.users(id),
  goods_description TEXT NOT NULL,
  goods_type TEXT NOT NULL,
  weight_kg DECIMAL(10,2) NOT NULL,
  origin_address TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  pickup_datetime TIMESTAMP NOT NULL,
  special_instructions TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_transit', 'delivered', 'cancelled')),
  price DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create tracking table for live location updates
CREATE TABLE shipment_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  speed DECIMAL(5,2),
  heading DECIMAL(5,2),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE shippers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- Create policies for shippers
CREATE POLICY "Users can view own shipper profile" ON shippers
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all shippers" ON shippers
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Users can insert own shipper profile" ON shippers
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own shipper profile" ON shippers
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can update all shippers" ON shippers
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

-- Create policies for vehicles
CREATE POLICY "Users can view own vehicle profile" ON vehicles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all vehicles" ON vehicles
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Users can insert own vehicle profile" ON vehicles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vehicle profile" ON vehicles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can update all vehicles" ON vehicles
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

-- Create policies for shipments
CREATE POLICY "Shippers can view own shipments" ON shipments
  FOR SELECT USING (auth.uid() = shipper_id);
CREATE POLICY "Truck owners can view assigned shipments" ON shipments
  FOR SELECT USING (auth.uid() = truck_owner_id);
CREATE POLICY "Anyone can view pending shipments" ON shipments
  FOR SELECT USING (status = 'pending' AND truck_owner_id IS NULL);
CREATE POLICY "Admins can view all shipments" ON shipments
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Shippers can create shipments" ON shipments
  FOR INSERT WITH CHECK (auth.uid() = shipper_id);
CREATE POLICY "Truck owners can update assigned shipments" ON shipments
  FOR UPDATE USING (auth.uid() = truck_owner_id);
CREATE POLICY "Admins can update all shipments" ON shipments
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

-- Enable RLS for tracking table
ALTER TABLE shipment_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies for tracking
CREATE POLICY "Truck owners can insert tracking data" ON shipment_tracking
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM shipments 
      WHERE id = shipment_id AND truck_owner_id = auth.uid()
    )
  );
CREATE POLICY "Shippers and truck owners can view tracking" ON shipment_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shipments 
      WHERE id = shipment_id AND (shipper_id = auth.uid() OR truck_owner_id = auth.uid())
    )
  );