-- Create shippers table for shipper registration
CREATE TABLE IF NOT EXISTS shippers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  business_type TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create vehicles table for truck owner profile completion
CREATE TABLE IF NOT EXISTS vehicles (
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

-- Create shipments table for load management
CREATE TABLE IF NOT EXISTS shipments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shipper_id UUID REFERENCES auth.users(id),
  truck_owner_id UUID REFERENCES auth.users(id),
  goods_description TEXT NOT NULL,
  goods_type TEXT NOT NULL,
  weight_kg DECIMAL(10,2) NOT NULL,
  origin_address TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  pickup_datetime TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE shippers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- Create policies for shippers table
CREATE POLICY "Users can view own shipper profile" ON shippers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shipper profile" ON shippers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shipper profile" ON shippers
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policies for vehicles table
CREATE POLICY "Users can view own vehicle profile" ON vehicles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vehicle profile" ON vehicles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vehicle profile" ON vehicles
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policies for shipments table
CREATE POLICY "Shippers can view own shipments" ON shipments
  FOR SELECT USING (auth.uid() = shipper_id);

CREATE POLICY "Truck owners can view assigned shipments" ON shipments
  FOR SELECT USING (auth.uid() = truck_owner_id);

CREATE POLICY "Anyone can view pending shipments" ON shipments
  FOR SELECT USING (status = 'pending' AND truck_owner_id IS NULL);

CREATE POLICY "Shippers can create shipments" ON shipments
  FOR INSERT WITH CHECK (auth.uid() = shipper_id);

CREATE POLICY "Truck owners can update assigned shipments" ON shipments
  FOR UPDATE USING (auth.uid() = truck_owner_id);