-- Seed data for customers with brand information
INSERT INTO customers (name, email, phone, address, source, brand, created_at, updated_at)
VALUES
  ('Juan Aluma', 'djcuenca321@hotmail.com', '+593987654321', 'Calle Principal 123, Quito', 'referral', 'sleepwear', NOW(), NOW()),
  ('María González', 'mariag@example.com', '+593998765432', 'Av. 10 de Agosto, Guayaquil', 'website', 'sleepwear', NOW(), NOW()),
  ('Carlos López', 'carlosl@example.com', '+593976543210', 'Calle Roca 456, Cuenca', 'social_media', 'bride', NOW(), NOW()),
  ('Ana Jiménez', 'anaj@example.com', '+593965432109', 'Av. 6 de Diciembre, Quito', 'event', 'bride', NOW(), NOW()),
  ('Pedro Martínez', 'pedrom@example.com', '+593954321098', 'Calle Colón 789, Ambato', 'cold_call', 'sleepwear', NOW(), NOW());

-- Seed data for sales with brand information
INSERT INTO sales (customer_id, amount, status, payment_method, brand, notes, created_at, updated_at)
VALUES
  (1, 150.00, 'completed', 'tarjeta', 'sleepwear', 'Pijama de seda (Pijamas) - $150.00 x 1', NOW(), NOW()),
  (2, 95.50, 'completed', 'efectivo', 'sleepwear', 'Bata de baño (Batas) - $95.50 x 1', NOW(), NOW()),
  (3, 450.00, 'completed', 'transferencia', 'bride', 'Velo de novia (Velos) - $250.00 x 1\nTocado de flores (Tocados) - $200.00 x 1', NOW(), NOW()),
  (4, 195.00, 'pending', 'tarjeta', 'bride', 'Accesorios para el cabello (Accesorios de Cabello) - $195.00 x 1', NOW(), NOW()),
  (5, 120.00, 'completed', 'efectivo', 'sleepwear', 'Conjunto de pijama (Conjuntos) - $120.00 x 1', NOW(), NOW());

-- Update leads with brand information
UPDATE leads SET brand = 'sleepwear' WHERE brand IS NULL;
