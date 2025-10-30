-- Admin Security Setup for RAMZ-FREIGHT
-- Run this in your Supabase SQL Editor

-- 1. Add admin login page URL to allowed redirect URLs in Supabase Dashboard:
-- Go to Authentication > URL Configuration > Redirect URLs
-- Add: https://muradahm1.github.io/RAMZ-FREIGHT/docs/management/management.html

-- 2. Create admin login endpoint
DROP FUNCTION IF EXISTS is_admin(uuid);

CREATE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id 
    AND user_role IN ('admin', 'management', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Secure RLS policies for admin access
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE truck_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE shippers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all shipments" ON shipments;
DROP POLICY IF EXISTS "Admins can view all vehicles" ON vehicles;
DROP POLICY IF EXISTS "Admins can view all truck_owners" ON truck_owners;
DROP POLICY IF EXISTS "Admins can view all shippers" ON shippers;

-- Admin can read all profiles
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Admin can read all shipments
CREATE POLICY "Admins can view all shipments"
ON shipments FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Admin can read all vehicles
CREATE POLICY "Admins can view all vehicles"
ON vehicles FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Admin can read all truck owners
CREATE POLICY "Admins can view all truck_owners"
ON truck_owners FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Admin can read all shippers
CREATE POLICY "Admins can view all shippers"
ON shippers FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- 4. Create admin user (replace with your email)
-- First, sign up normally at your site, then run:
-- UPDATE profiles SET user_role = 'admin' WHERE id = 'your-user-id';
-- Or use email:
-- UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"admin"') WHERE email = 'your-admin-email@example.com';
-- UPDATE profiles SET user_role = 'admin' WHERE email = 'your-admin-email@example.com';
