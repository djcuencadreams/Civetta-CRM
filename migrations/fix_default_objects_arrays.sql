-- Actualizar valores predeterminados para campos que usan objetos/arrays
ALTER TABLE products ALTER COLUMN dimensions SET DEFAULT '{}';
ALTER TABLE products ALTER COLUMN images SET DEFAULT '[]';
ALTER TABLE products ALTER COLUMN attributes SET DEFAULT '{}';
ALTER TABLE products ALTER COLUMN variants SET DEFAULT '[]';
ALTER TABLE products ALTER COLUMN related_products SET DEFAULT '[]';

ALTER TABLE orders ALTER COLUMN payment_details SET DEFAULT '{}';
ALTER TABLE orders ALTER COLUMN shipping_address SET DEFAULT '{}';
ALTER TABLE orders ALTER COLUMN billing_address SET DEFAULT '{}';

ALTER TABLE order_items ALTER COLUMN attributes SET DEFAULT '{}';

ALTER TABLE opportunities ALTER COLUMN products_interested SET DEFAULT '[]';

ALTER TABLE interactions ALTER COLUMN attachments SET DEFAULT '[]';

-- Crear un script para ejecutar en producción
COMMENT ON SCHEMA public IS 'Objetos y arrays ahora usan JSON para valores predeterminados';