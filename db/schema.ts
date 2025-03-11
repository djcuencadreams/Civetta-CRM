import { pgTable, text, serial, integer, timestamp, decimal, boolean, varchar, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import * as z from 'zod';

// Define the brand enum values
export const brandEnum = {
  SLEEPWEAR: 'sleepwear',
  BRIDE: 'bride',
} as const;

// Define order status enum values
export const orderStatusEnum = {
  NEW: 'new',
  PREPARING: 'preparing',
  SHIPPED: 'shipped',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

// Define payment status enum values
export const paymentStatusEnum = {
  PENDING: 'pending',
  PAID: 'paid',
  REFUNDED: 'refunded',
  FAILED: 'failed'
} as const;

// Define payment method enum values
export const paymentMethodEnum = {
  CASH: 'cash',
  TRANSFER: 'transfer',
  CARD: 'card',
  PAYPAL: 'paypal',
  OTHER: 'other'
} as const;

// Define source enum values
export const sourceEnum = {
  INSTAGRAM: 'instagram',
  FACEBOOK: 'facebook',
  TIKTOK: 'tiktok',
  WEBSITE: 'website',
  WOOCOMMERCE: 'woocommerce',
  WHATSAPP: 'whatsapp',
  EMAIL: 'email',
  EVENT: 'event',
  REFERRAL: 'referral',
  STORE: 'store',
  MASS_MEDIA: 'mass_media',
  CALL: 'call',
  OTHER: 'other'
} as const;

// Define lead status enum values
export const leadStatusEnum = {
  NEW: 'new',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  PROPOSAL: 'proposal',
  NEGOTIATION: 'negotiation',
  WON: 'won',
  LOST: 'lost',
  SCHEDULED: 'scheduled',
  PENDING: 'pending',
  CONVERTED: 'converted'
} as const;

// Define base tables first
export const webhooks = pgTable("webhooks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  event: text("event").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  idNumber: text("id_number"), // Cédula/Pasaporte for invoicing and shipping
  email: text("email"),
  phone: text("phone"),
  phoneCountry: text("phone_country"),
  phoneNumber: text("phone_number"), // Store the phone number without country code
  street: text("street"),
  city: text("city"),
  province: text("province"),
  deliveryInstructions: text("delivery_instructions"),
  address: text("address"), // Keeping for backward compatibility
  source: varchar("source", { length: 50 }).default('instagram'),
  brand: varchar("brand", { length: 20 }).default(brandEnum.SLEEPWEAR),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  idNumber: text("id_number"), // Agregamos idNumber para mantener consistencia con customers
  email: text("email"),
  phone: text("phone"),
  phoneCountry: text("phone_country"),
  phoneNumber: text("phone_number"), // Store the phone number without country code
  street: text("street"),
  city: text("city"),
  province: text("province"),
  deliveryInstructions: text("delivery_instructions"),
  status: varchar("status", { length: 50 }).notNull().default(leadStatusEnum.NEW),
  source: varchar("source", { length: 50 }).notNull().default(sourceEnum.INSTAGRAM),
  brand: varchar("brand", { length: 20 }).default(brandEnum.SLEEPWEAR),
  brandInterest: varchar("brand_interest", { length: 50 }), // Marca específica de interés
  notes: text("notes"),
  convertedToCustomer: boolean("converted_to_customer").default(false),
  convertedCustomerId: integer("converted_customer_id").references(() => customers.id),
  lastContact: timestamp("last_contact"),
  nextFollowUp: timestamp("next_follow_up"),
  customerLifecycleStage: varchar("customer_lifecycle_stage", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const leadActivities = pgTable("lead_activities", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => leads.id),
  type: varchar("type", { length: 50 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Define product categories table
export const productCategories = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  slug: text("slug").notNull().unique(),
  brand: varchar("brand", { length: 20 }).default(brandEnum.SLEEPWEAR),
  wooCommerceCategoryId: integer("woocommerce_category_id"), // ID de la categoría en WooCommerce
  parentCategoryId: integer("parent_category_id"), // Se establecerá la relación en las relaciones
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Nueva tabla para productos
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  description: text("description"),
  categoryId: integer("category_id").references(() => productCategories.id),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").default(0),
  brand: varchar("brand", { length: 20 }).default(brandEnum.SLEEPWEAR),
  wooCommerceId: integer("woocommerce_id"), // ID del producto en WooCommerce para sincronización
  wooCommerceUrl: text("woocommerce_url"), // URL del producto en WooCommerce
  active: boolean("active").default(true),
  images: jsonb("images").default([]), // URLs de imágenes como array JSON
  attributes: jsonb("attributes").default({}), // Atributos como objeto JSON (color, talla, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Nueva tabla para órdenes/pedidos
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id),
  leadId: integer("lead_id").references(() => leads.id), // Opcional: si el pedido viene de un lead que aún no es cliente
  orderNumber: text("order_number").unique(), // Número de pedido único (puede ser generado o externo)
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).default(orderStatusEnum.NEW),
  paymentStatus: varchar("payment_status", { length: 50 }).default(paymentStatusEnum.PENDING),
  paymentMethod: varchar("payment_method", { length: 50 }),
  source: varchar("source", { length: 50 }).default(sourceEnum.WEBSITE),
  wooCommerceId: integer("woocommerce_id"), // ID del pedido en WooCommerce para sincronización
  brand: varchar("brand", { length: 20 }).default(brandEnum.SLEEPWEAR),
  shippingAddress: jsonb("shipping_address").default({}), // Dirección de envío como objeto JSON
  billingAddress: jsonb("billing_address").default({}), // Dirección de facturación como objeto JSON
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Nueva tabla para items de órdenes (detalles de productos en cada orden)
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  productId: integer("product_id").references(() => products.id),
  productName: text("product_name").notNull(), // Guardamos el nombre por si el producto se elimina
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  attributes: jsonb("attributes").default({}), // Atributos del producto como objeto JSON (color, talla, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  orderId: integer("order_id").references(() => orders.id), // Referencia a la orden que generó esta venta
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull(),
  paymentMethod: text("payment_method"),
  brand: varchar("brand", { length: 20 }).default(brandEnum.SLEEPWEAR),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Define relations
export const customerRelations = relations(customers, ({ many }) => ({
  sales: many(sales),
  orders: many(orders),
  leads: many(leads, { relationName: "convertedLeads" })
}));

export const leadRelations = relations(leads, ({ one, many }) => ({
  convertedCustomer: one(customers, {
    fields: [leads.convertedCustomerId],
    references: [customers.id],
    relationName: "convertedLeads"
  }),
  activities: many(leadActivities),
  orders: many(orders)
}));

export const leadActivityRelations = relations(leadActivities, ({ one }) => ({
  lead: one(leads, {
    fields: [leadActivities.leadId],
    references: [leads.id]
  })
}));

export const salesRelations = relations(sales, ({ one }) => ({
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id]
  }),
  order: one(orders, {
    fields: [sales.orderId],
    references: [orders.id]
  })
}));

export const orderRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id]
  }),
  lead: one(leads, {
    fields: [orders.leadId],
    references: [leads.id]
  }),
  items: many(orderItems),
  sales: many(sales)
}));

export const orderItemRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id]
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id]
  })
}));

export const productRelations = relations(products, ({ one, many }) => ({
  category: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id]
  }),
  orderItems: many(orderItems)
}));

export const productCategoryRelations = relations(productCategories, ({ one, many }) => ({
  parentCategory: one(productCategories, {
    fields: [productCategories.parentCategoryId],
    references: [productCategories.id]
  }),
  childCategories: many(productCategories, {
    relationName: "parentChild"
  }),
  products: many(products)
}));

// Schemas for validation
export const insertLeadSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  email: z.string().email("Email inválido").optional().nullable(),
  phone: z.string().optional().nullable(),
  phoneCountry: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  deliveryInstructions: z.string().optional().nullable(),
  status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']).default('new'),
  source: z.enum(['instagram', 'facebook', 'tiktok', 'website', 'whatsapp', 'email', 'event', 'referral', 'mass_media', 'call', 'other']).default('instagram'),
  brand: z.enum([brandEnum.SLEEPWEAR, brandEnum.BRIDE]).default(brandEnum.SLEEPWEAR),
  notes: z.string().optional().nullable(),
  lastContact: z.string().optional().nullable().transform(val => val ? new Date(val) : null),
  nextFollowUp: z.string().optional().nullable().transform(val => val ? new Date(val) : null)
});

export const insertCustomerSchema = createInsertSchema(customers);
export const insertSaleSchema = createInsertSchema(sales);
export const insertWebhookSchema = createInsertSchema(webhooks);


export const insertProductSchema = createInsertSchema(products);
export const insertOrderSchema = createInsertSchema(orders);
export const insertOrderItemSchema = createInsertSchema(orderItems);
export const insertProductCategorySchema = createInsertSchema(productCategories);
export const selectCustomerSchema = createSelectSchema(customers);
export const selectSaleSchema = createSelectSchema(sales);
export const selectWebhookSchema = createSelectSchema(webhooks);
export const selectLeadSchema = createSelectSchema(leads);



export const selectProductSchema = createSelectSchema(products);
export const selectOrderSchema = createSelectSchema(orders);
export const selectOrderItemSchema = createSelectSchema(orderItems);
export const selectProductCategorySchema = createSelectSchema(productCategories);
// Type exports
export type Customer = typeof customers.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type Webhook = typeof webhooks.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type LeadActivity = typeof leadActivities.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type ProductCategory = typeof productCategories.$inferSelect;
