-- TEMPORARY: Disable RLS on shipments for testing
-- Run this in Supabase SQL Editor to test if shipments work

ALTER TABLE shipments DISABLE ROW LEVEL SECURITY;

-- After testing, you can re-enable with:
-- ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
