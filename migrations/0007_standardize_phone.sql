
-- Drop old phone columns
ALTER TABLE customers DROP COLUMN IF EXISTS phone_country;
ALTER TABLE customers DROP COLUMN IF EXISTS phone_number;

-- Ensure phone column exists and is properly typed
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone text;

-- Add constraint for E.164 format
ALTER TABLE customers ADD CONSTRAINT phone_format CHECK (
  phone IS NULL OR (
    phone LIKE '+%' AND 
    length(phone) >= 10 AND 
    length(phone) <= 15
  )
);

-- Add unique index ignoring leading zeros
CREATE UNIQUE INDEX IF NOT EXISTS customers_phone_unique_idx ON customers (
  CASE 
    WHEN phone LIKE '+593%' THEN 
      regexp_replace(phone, '^\+593(0?)', '+593')
    ELSE phone
  END
) WHERE phone IS NOT NULL;
