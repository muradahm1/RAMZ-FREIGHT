-- Fix RLS Policies for Shipments Table (SECURE VERSION)
-- Run this in Supabase SQL Editor

-- Create profiles table if it doesn't exist (secure role storage)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

-- Only service role can insert/update profiles (secure)
CREATE POLICY "Service role manages profiles" ON profiles
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Drop existing shipments policies
DROP POLICY IF EXISTS "Shippers can insert their own shipments" ON shipments;
DROP POLICY IF EXISTS "Shippers can view their own shipments" ON shipments;
DROP POLICY IF EXISTS "Truck owners can view pending and assigned shipments" ON shipments;
DROP POLICY IF EXISTS "Truck owners can view available shipments" ON shipments;
DROP POLICY IF EXISTS "Truck owners can update assigned shipments" ON shipments;
DROP POLICY IF EXISTS "Admins can view all shipments" ON shipments;
DROP POLICY IF EXISTS "Service role has full access" ON shipments;

-- Enable RLS on shipments table
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can insert shipments
CREATE POLICY "Authenticated can insert shipments"
ON shipments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = shipper_id);

-- Policy: Users can view their own shipments as shipper
CREATE POLICY "View own shipments as shipper"
ON shipments
FOR SELECT
TO authenticated
USING (auth.uid() = shipper_id);

-- Policy: Truck owners can view pending or assigned shipments
CREATE POLICY "Truck owners view available shipments"
ON shipments
FOR SELECT
TO authenticated
USING (
  status = 'pending' OR 
  auth.uid() = truck_owner_id
);

-- Policy: Truck owners can update shipments (assign themselves or update assigned)
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

-- Policy: Admins can view all (using secure profiles table)
CREATE POLICY "Admins view all shipments"
ON shipments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_role IN ('admin', 'manager', 'management')
  )
);

-- Create function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'user_role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
