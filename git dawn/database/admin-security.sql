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

-- 3. Secure RLS policies for admin access (only for existing tables)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'profiles') THEN
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
        CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT TO authenticated USING (is_admin(auth.uid()));
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'shipments') THEN
        ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Admins can view all shipments" ON shipments;
        CREATE POLICY "Admins can view all shipments" ON shipments FOR SELECT TO authenticated USING (is_admin(auth.uid()));
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'shippers') THEN
        ALTER TABLE shippers ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Admins can view all shippers" ON shippers;
        CREATE POLICY "Admins can view all shippers" ON shippers FOR SELECT TO authenticated USING (is_admin(auth.uid()));
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'vehicles') THEN
        ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Admins can view all vehicles" ON vehicles;
        CREATE POLICY "Admins can view all vehicles" ON vehicles FOR SELECT TO authenticated USING (is_admin(auth.uid()));
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'notifications') THEN
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;
        CREATE POLICY "Admins can view all notifications" ON notifications FOR SELECT TO authenticated USING (is_admin(auth.uid()));
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'ratings') THEN
        ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Admins can view all ratings" ON ratings;
        CREATE POLICY "Admins can view all ratings" ON ratings FOR SELECT TO authenticated USING (is_admin(auth.uid()));
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'shipment_tracking') THEN
        ALTER TABLE shipment_tracking ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Admins can view all tracking" ON shipment_tracking;
        CREATE POLICY "Admins can view all tracking" ON shipment_tracking FOR SELECT TO authenticated USING (is_admin(auth.uid()));
    END IF;
END $$;

-- 4. Create admin user (replace with your email)
-- First, sign up normally at your site, then run:
-- UPDATE profiles SET user_role = 'admin' WHERE id = 'your-user-id';
-- Or use email:
-- UPDATE auth.users SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"admin"') WHERE email = 'your-admin-email@example.com';
-- UPDATE profiles SET user_role = 'admin' WHERE email = 'your-admin-email@example.com';
