-- 
-- Migración para estandarizar datos de clientes en CRM
-- Fecha: 7 de abril de 2025
--

-- Actualizar registros de clientes que tienen first_name o last_name nulos
UPDATE customers
SET 
  first_name = CASE 
    WHEN first_name IS NULL OR first_name = '' THEN 
      CASE 
        WHEN position(' ' in name) > 0 THEN 
          SPLIT_PART(name, ' ', 1)
        ELSE 
          name
      END
    ELSE 
      first_name
  END,
  last_name = CASE 
    WHEN last_name IS NULL OR last_name = '' THEN 
      CASE 
        WHEN position(' ' in name) > 0 THEN 
          SUBSTRING(name FROM position(' ' in name) + 1)
        ELSE 
          ''
      END
    ELSE 
      last_name
  END
WHERE 
  first_name IS NULL OR last_name IS NULL OR first_name = '' OR last_name = '';

-- Regenerar el campo name a partir de first_name y last_name para garantizar consistencia
UPDATE customers
SET name = TRIM(first_name || ' ' || last_name)
WHERE first_name IS NOT NULL AND last_name IS NOT NULL;

-- Hacer lo mismo con leads
UPDATE leads
SET 
  first_name = CASE 
    WHEN first_name IS NULL OR first_name = '' THEN 
      CASE 
        WHEN position(' ' in name) > 0 THEN 
          SPLIT_PART(name, ' ', 1)
        ELSE 
          name
      END
    ELSE 
      first_name
  END,
  last_name = CASE 
    WHEN last_name IS NULL OR last_name = '' THEN 
      CASE 
        WHEN position(' ' in name) > 0 THEN 
          SUBSTRING(name FROM position(' ' in name) + 1)
        ELSE 
          ''
      END
    ELSE 
      last_name
  END
WHERE 
  first_name IS NULL OR last_name IS NULL OR first_name = '' OR last_name = '';

-- Regenerar el campo name a partir de first_name y last_name para garantizar consistencia
UPDATE leads
SET name = TRIM(first_name || ' ' || last_name)
WHERE first_name IS NOT NULL AND last_name IS NOT NULL;

-- Agregar la restricción NOT NULL después de que todos los datos sean actualizados
-- (Solo si estamos seguros de que todos los registros tienen valores en estos campos)
ALTER TABLE customers ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE customers ALTER COLUMN last_name SET NOT NULL;
ALTER TABLE leads ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE leads ALTER COLUMN last_name SET NOT NULL;