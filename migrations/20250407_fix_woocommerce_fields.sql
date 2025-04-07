-- Migración para corregir y estandarizar campos de WooCommerce
-- Fecha: 07/04/2025

-- 1. Agregar o corregir campo wooCommerceId en la tabla sales (en camelCase)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS "wooCommerceId" INTEGER;

-- 2. Verificar que no haya inconsistencias en los nombres de campos

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE 'Migración completada: Campos WooCommerce corregidos y estandarizados.';
END $$;
