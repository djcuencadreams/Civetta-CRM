-- Migración para estandarizar los nombres de campos WooCommerce a camelCase
-- Renombra campos existentes de snake_case a camelCase

-- Customers
ALTER TABLE "customers" 
RENAME COLUMN "woocommerce_id" TO "wooCommerceId";

-- Product Categories
ALTER TABLE "product_categories" 
RENAME COLUMN "woocommerce_category_id" TO "wooCommerceCategoryId";

-- Products
ALTER TABLE "products" 
RENAME COLUMN "woocommerce_id" TO "wooCommerceId";

ALTER TABLE "products" 
RENAME COLUMN "woocommerce_parent_id" TO "wooCommerceParentId";

ALTER TABLE "products" 
RENAME COLUMN "woocommerce_url" TO "wooCommerceUrl";

-- Orders
ALTER TABLE "orders" 
RENAME COLUMN "woocommerce_id" TO "wooCommerceId";