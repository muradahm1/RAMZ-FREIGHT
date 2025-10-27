-- Create profiles table to store user roles securely
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_role TEXT NOT NULL CHECK (user_role IN ('shipper', 'truck_owner', 'admin', 'manager')),
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
-- Ensure idempotency: drop existing policy if present
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Policy: Users can update their own profile (but NOT user_role)
-- Ensure idempotency: drop existing policy if present
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_user_role ON profiles(user_role);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_role, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'user_role', 'shipper'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update shipments RLS policies to use profiles table instead of user_metadata
DROP POLICY IF EXISTS "Admins can view all shipments" ON shipments;
DROP POLICY IF EXISTS "Shippers can view own shipments" ON shipments;
DROP POLICY IF EXISTS "Truck owners can view assigned and pending shipments" ON shipments;

-- New secure policies using profiles table
CREATE POLICY "Shippers can view own shipments" ON shipments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role = 'shipper'
      AND shipments.shipper_id = auth.uid()
    )
  );

CREATE POLICY "Truck owners can view assigned and pending shipments" ON shipments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role = 'truck_owner'
      AND (shipments.truck_owner_id = auth.uid() OR shipments.status = 'pending')
    )
  );

CREATE POLICY "Admins can view all shipments" ON shipments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'manager')
    )
  );

-- Shippers can create shipments
CREATE POLICY "Shippers can create shipments" ON shipments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role = 'shipper'
      AND shipments.shipper_id = auth.uid()
    )
  );

-- Truck owners can update shipments assigned to them
CREATE POLICY "Truck owners can update assigned shipments" ON shipments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role = 'truck_owner'
      AND shipments.truck_owner_id = auth.uid()
    )
  );
