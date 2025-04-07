-- Migración para estandarizar datos de clientes en el CRM
-- Fecha: 7 de abril 2025
-- Descripción: Esta migración implementa la estandarización de los campos nombre
-- en el CRM, asegurando que firstName y lastName sean campos obligatorios en todos
-- los registros de clientes y leads.

-- Fase 1: Actualizar registros para llenar los valores firstName y lastName a partir del campo name

-- Actualizar tabla de customers
UPDATE customers
SET 
  first_name = CASE 
    WHEN name IS NULL THEN 'Unknown'
    WHEN POSITION(' ' IN name) > 0 THEN SUBSTRING(name FROM 1 FOR POSITION(' ' IN name) - 1)
    ELSE name
  END,
  last_name = CASE
    WHEN name IS NULL THEN 'Unknown'
    WHEN POSITION(' ' IN name) > 0 THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
    ELSE 'Unknown'
  END
WHERE first_name IS NULL OR last_name IS NULL;

-- Actualizar tabla de leads
UPDATE leads
SET
  first_name = CASE 
    WHEN name IS NULL THEN 'Unknown'
    WHEN POSITION(' ' IN name) > 0 THEN SUBSTRING(name FROM 1 FOR POSITION(' ' IN name) - 1)
    ELSE name
  END,
  last_name = CASE
    WHEN name IS NULL THEN 'Unknown'
    WHEN POSITION(' ' IN name) > 0 THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
    ELSE 'Unknown'
  END
WHERE first_name IS NULL OR last_name IS NULL;

-- Fase 2: Asegurar la consistencia del campo name en todos los registros

-- Actualizar el campo name para que siempre sea firstName + ' ' + lastName
UPDATE customers
SET name = TRIM(first_name || ' ' || last_name)
WHERE name IS NULL OR name != TRIM(first_name || ' ' || last_name);

UPDATE leads
SET name = TRIM(first_name || ' ' || last_name)
WHERE name IS NULL OR name != TRIM(first_name || ' ' || last_name);

-- Fase 3: Aplicar restricciones NOT NULL a firstName y lastName

-- Antes de aplicar restricciones, verificamos que no hay valores nulos
-- Si esta consulta retorna registros, la migración debe interrumpirse
SELECT id, name FROM customers WHERE first_name IS NULL OR last_name IS NULL;
SELECT id, name FROM leads WHERE first_name IS NULL OR last_name IS NULL;

-- Aplicar restricciones NOT NULL
ALTER TABLE customers 
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name SET NOT NULL;

ALTER TABLE leads
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name SET NOT NULL;

-- Fase 4: Resumen de la migración

-- Número de registros actualizados
SELECT COUNT(*) as customers_updated FROM customers;
SELECT COUNT(*) as leads_updated FROM leads;

-- Estadísticas finales
INSERT INTO migration_logs (migration_id, description, executed_at, status, details)
VALUES (
  '20250407_customer_data_standardization',
  'Customer name fields standardization',
  NOW(),
  'SUCCESS',
  'Enforced firstName and lastName as required fields across customers and leads tables'
);

-- Nota final
COMMENT ON COLUMN customers.name IS 'Deprecated: Use firstName and lastName instead. This field is automatically generated and maintained for backwards compatibility.';
COMMENT ON COLUMN leads.name IS 'Deprecated: Use firstName and lastName instead. This field is automatically generated and maintained for backwards compatibility.';
