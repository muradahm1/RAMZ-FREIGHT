-- Add role validation to prevent duplicate registrations across roles

-- Create a function to check if email exists with different role
CREATE OR REPLACE FUNCTION check_user_role_conflict(user_email TEXT, new_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    existing_role TEXT;
BEGIN
    -- Get the role of existing user with this email
    SELECT raw_user_meta_data->>'user_role' 
    INTO existing_role
    FROM auth.users 
    WHERE email = user_email 
    AND deleted_at IS NULL;
    
    -- If no user exists, no conflict
    IF existing_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- If same role, no conflict (allow re-registration)
    IF existing_role = new_role THEN
        RETURN FALSE;
    END IF;
    
    -- Different role exists, conflict detected
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger function to validate role on user creation
CREATE OR REPLACE FUNCTION validate_user_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Check for role conflicts on INSERT
    IF TG_OP = 'INSERT' THEN
        IF check_user_role_conflict(NEW.email, NEW.raw_user_meta_data->>'user_role') THEN
            RAISE EXCEPTION 'An account with this email already exists with a different role. Please use a different email or login with your existing account.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'validate_user_role_trigger'
    ) THEN
        CREATE TRIGGER validate_user_role_trigger
            BEFORE INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION validate_user_role();
    END IF;
END $$;