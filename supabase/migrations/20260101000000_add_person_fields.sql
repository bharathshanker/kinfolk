-- Migration: Add phone, date_of_birth, and gender fields to people table
-- Date: 2026-01-01
-- Description: Add new required fields for better profile matching and collaboration

-- Add new columns to people table
ALTER TABLE people
ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT '',
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT 'other';

-- Create indexes for better query performance on merge keys
CREATE INDEX IF NOT EXISTS idx_people_email ON people(email);
CREATE INDEX IF NOT EXISTS idx_people_phone ON people(phone);
CREATE INDEX IF NOT EXISTS idx_people_date_of_birth ON people(date_of_birth);

-- Update existing rows to have default values
UPDATE people
SET
  phone = COALESCE(phone, ''),
  gender = COALESCE(gender, 'other')
WHERE phone IS NULL OR gender IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN people.phone IS 'Phone number for profile matching and contact';
COMMENT ON COLUMN people.date_of_birth IS 'Date of birth for merge key and birthday reminders';
COMMENT ON COLUMN people.gender IS 'Gender for avatar personalization: male, female, or other';

-- Add constraint to ensure gender is one of the valid values
ALTER TABLE people
ADD CONSTRAINT check_gender CHECK (gender IN ('male', 'female', 'other'));
