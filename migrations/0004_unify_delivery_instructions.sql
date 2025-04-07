
-- Drop any duplicate columns if they exist
ALTER TABLE customers DROP COLUMN IF EXISTS instructions;
ALTER TABLE customers DROP COLUMN IF EXISTS shipping_instructions;

-- Ensure delivery_instructions exists and has the correct type
ALTER TABLE customers ALTER COLUMN delivery_instructions TYPE text;

-- Migrate any existing data from shipping_address.instructions if that table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shipping_addresses') THEN
    UPDATE customers c
    SET delivery_instructions = sa.instructions
    FROM shipping_addresses sa
    WHERE c.id = sa.customer_id 
    AND c.delivery_instructions IS NULL 
    AND sa.instructions IS NOT NULL;
  END IF;
END $$;
