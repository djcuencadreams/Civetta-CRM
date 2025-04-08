
-- Estandarizar campos de teléfono
ALTER TABLE customers 
DROP COLUMN IF EXISTS phone_country,
DROP COLUMN IF EXISTS phone_number,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Convertir datos existentes
UPDATE customers 
SET phone = CASE 
  WHEN phone_country IS NOT NULL AND phone_number IS NOT NULL 
  THEN phone_country || phone_number
  ELSE NULL 
END;
