-- Fix role conflicts - prevent same email from having multiple roles
-- This script ensures users can only have one role per email address

-- 1. Update the role validation function to be more robust
CREATE OR REPLACE FUNCTION check_user_role_conflict(user_email TEXT, new_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    existing_role TEXT;
    user_exists BOOLEAN;
BEGIN
    -- Check if user exists with this email
    SELECT EXISTS(
        SELECT 1 FROM auth.users 
        WHERE email = user_email 
        AND deleted_at IS NULL
    ) INTO user_exists;
    
    -- If no user exists, no conflict
    IF NOT user_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Get the role of existing user with this email
    SELECT raw_user_meta_data->>'user_role' 
    INTO existing_role
    FROM auth.users 
    WHERE email = user_email 
    AND deleted_at IS NULL
    LIMIT 1;
    
    -- If existing role is null or empty, allow registration
    IF existing_role IS NULL OR existing_role = '' THEN
        RETURN FALSE;
    END IF;
    
    -- Normalize role names for comparison
    existing_role := LOWER(TRIM(existing_role));
    new_role := LOWER(TRIM(new_role));
    
    -- Handle role variations
    IF existing_role IN ('truck_owner', 'truck') THEN
        existing_role := 'truck_owner';
    END IF;
    
    IF new_role IN ('truck_owner', 'truck') THEN
        new_role := 'truck_owner';
    END IF;
    
    -- If same role, no conflict
    IF existing_role = new_role THEN
        RETURN FALSE;
    END IF;
    
    -- Different role exists, conflict detected
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create a function to validate login attempts
CREATE OR REPLACE FUNCTION validate_login_role(user_email TEXT, expected_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Get user role from metadata
    SELECT raw_user_meta_data->>'user_role' 
    INTO user_role
    FROM auth.users 
    WHERE email = user_email 
    AND deleted_at IS NULL
    LIMIT 1;
    
    -- If no role found, deny access
    IF user_role IS NULL OR user_role = '' THEN
        RETURN FALSE;
    END IF;
    
    -- Normalize roles
    user_role := LOWER(TRIM(user_role));
    expected_role := LOWER(TRIM(expected_role));
    
    -- Handle role variations
    IF user_role IN ('truck_owner', 'truck') THEN
        user_role := 'truck_owner';
    END IF;
    
    IF expected_role IN ('truck_owner', 'truck') THEN
        expected_role := 'truck_owner';
    END IF;
    
    -- Return true if roles match
    RETURN user_role = expected_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create a function to get user role by email
CREATE OR REPLACE FUNCTION get_user_role_by_email(user_email TEXT)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT raw_user_meta_data->>'user_role' 
    INTO user_role
    FROM auth.users 
    WHERE email = user_email 
    AND deleted_at IS NULL
    LIMIT 1;
    
    RETURN COALESCE(user_role, '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant execute permissions
GRANT EXECUTE ON FUNCTION check_user_role_conflict(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION validate_login_role(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_role_by_email(TEXT) TO anon, authenticated;