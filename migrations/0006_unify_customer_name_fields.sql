-- Migración para la estandarización de datos de clientes
-- Fecha: 7 de abril de 2025

-- Paso 1: Asegurar que todos los clientes tienen first_name y last_name basados en name 
UPDATE customers
SET 
  first_name = COALESCE(first_name, SPLIT_PART(name, ' ', 1)), 
  last_name = COALESCE(last_name, 
    CASE 
      WHEN POSITION(' ' IN name) > 0 
      THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1) 
      ELSE '' 
    END
  )
WHERE 
  first_name IS NULL OR last_name IS NULL;

-- Paso 2: Actualizar name para que sea la combinación de first_name y last_name, garantizando consistencia
UPDATE customers
SET name = TRIM(first_name || ' ' || last_name)
WHERE first_name IS NOT NULL AND last_name IS NOT NULL;

-- Paso 3: Unificar campos de número de identificación
UPDATE customers
SET 
  id_number = COALESCE(id_number, idNumber, '')
WHERE 
  id_number IS NULL AND idNumber IS NOT NULL;

-- Paso 4: Asegurarse que todos los clientes tienen campos estructurados de dirección completos
UPDATE customers
SET 
  street = COALESCE(street, 
    CASE 
      WHEN address IS NOT NULL AND POSITION(',' IN address) > 0 
      THEN SPLIT_PART(address, ',', 1) 
      ELSE address 
    END, 
    ''
  ),
  city = COALESCE(city, 
    CASE 
      WHEN address IS NOT NULL AND POSITION(',' IN address) > 0 
      THEN SPLIT_PART(address, ',', 2) 
      ELSE '' 
    END, 
    'Cuenca'
  ),
  province = COALESCE(province, 'Azuay')
WHERE 
  street IS NULL OR city IS NULL OR province IS NULL;

-- Asegurar que el field first_name es NOT NULL y requerido
ALTER TABLE customers 
  ALTER COLUMN first_name SET NOT NULL;

-- Asegurar que el field last_name es NOT NULL y requerido
ALTER TABLE customers 
  ALTER COLUMN last_name SET NOT NULL;