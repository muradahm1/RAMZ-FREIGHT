-- Add document URL columns to vehicles table
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS id_front_url TEXT,
ADD COLUMN IF NOT EXISTS id_back_url TEXT,
ADD COLUMN IF NOT EXISTS driving_licence_front_url TEXT,
ADD COLUMN IF NOT EXISTS driving_licence_back_url TEXT,
ADD COLUMN IF NOT EXISTS vehicle_photo_url TEXT,
ADD COLUMN IF NOT EXISTS vehicle_license_url TEXT;