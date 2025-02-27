-- Add brand column to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS brand VARCHAR(20) DEFAULT 'sleepwear';

-- Add brand column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS brand VARCHAR(20) DEFAULT 'sleepwear';

-- Add brand column to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS brand VARCHAR(20) DEFAULT 'sleepwear';

-- Create product_categories table
CREATE TABLE IF NOT EXISTS product_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  brand VARCHAR(20) DEFAULT 'sleepwear',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default product categories for Sleepwear
INSERT INTO product_categories (name, brand) VALUES 
('Pijamas', 'sleepwear'),
('Ropa Interior', 'sleepwear'),
('Batas', 'sleepwear'),
('Conjuntos', 'sleepwear'),
('Accesorios', 'sleepwear');

-- Insert default product categories for Bride
INSERT INTO product_categories (name, brand) VALUES 
('Velos', 'bride'),
('Tocados', 'bride'),
('Accesorios de Cabello', 'bride'),
('Joyería', 'bride'),
('Ligas', 'bride');
