
-- Drop old phone fields
ALTER TABLE customers DROP COLUMN IF EXISTS phone_country;
ALTER TABLE customers DROP COLUMN IF EXISTS phone_number;
ALTER TABLE customers DROP COLUMN IF EXISTS country_code;

-- Ensure phone column exists and has correct type
ALTER TABLE customers ALTER COLUMN phone TYPE text;

-- Add unique constraint
ALTER TABLE customers DROP CONSTRAINT IF EXISTS unique_customer_phone;
ALTER TABLE customers ADD CONSTRAINT unique_customer_phone UNIQUE (phone);
