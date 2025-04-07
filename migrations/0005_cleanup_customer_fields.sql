
-- Eliminar campos antiguos y redundantes si existen
ALTER TABLE customers DROP COLUMN IF EXISTS address;
ALTER TABLE customers DROP COLUMN IF EXISTS woo_commerce_id;
ALTER TABLE customers DROP COLUMN IF EXISTS instructions;
ALTER TABLE customers DROP COLUMN IF EXISTS shipping_instructions;

-- Asegurar que el campo delivery_instructions existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' 
    AND column_name = 'delivery_instructions'
  ) THEN
    ALTER TABLE customers ADD COLUMN delivery_instructions text;
  END IF;
END $$;
