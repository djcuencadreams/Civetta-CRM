import { sql } from 'drizzle-orm';
import { text, integer, serial, timestamp, boolean, pgTable, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import * as z from 'zod';

// Tabla para almacenar configuraciones de servicios
export const serviceConfigurations = pgTable("service_configurations", {
  id: serial("id").primaryKey(),
  service: text("service").notNull().unique(),
  config: text("config").notNull().default(sql`'{}'`),
  enabled: boolean("enabled").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

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
  PENDIENTE_DE_COMPLETAR: 'pendiente_de_completar', // Status for orders without products
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

// Define lead priority enum values
export const priorityEnum = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
} as const;

// Define customer type enum values
export const customerTypeEnum = {
  PERSON: 'person',
  COMPANY: 'company'
} as const;

// Define customer status enum values
export const customerStatusEnum = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  VIP: 'vip'
} as const;

// Define user role enum values
export const userRoleEnum = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  SALES: 'sales',
  SUPPORT: 'support'
} as const;

// Define interaction type enum values
export const interactionTypeEnum = {
  QUERY: 'query',
  COMPLAINT: 'complaint',
  FOLLOWUP: 'followup',
  ORDER: 'order',
  SUPPORT: 'support',
} as const;

// Define interaction channel enum values
export const interactionChannelEnum = {
  WHATSAPP: 'whatsapp',
  INSTAGRAM: 'instagram',
  PHONE: 'phone',
  EMAIL: 'email',
  MEETING: 'meeting',
} as const;

// Define opportunity status enum values
export const opportunityStatusEnum = {
  NEGOTIATION: 'negotiation',
  PROPOSAL: 'proposal',
  CLOSED_WON: 'closed_won',
  CLOSED_LOST: 'closed_lost'
} as const;


// Define activity type enum values
export const activityTypeEnum = {
  CALL: 'call',
  MEETING: 'meeting',
  TASK: 'task',
  FOLLOWUP: 'followup'
} as const;

// Define activity status enum values
export const activityStatusEnum = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
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

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name'), // Campo computado a partir de firstName + lastName (nullable para permitir migración)
  firstName: text('first_name').notNull(), // Requerido: nombre del cliente
  lastName: text('last_name').notNull(), // Requerido: apellido del cliente
  type: text('type').default('person'),
  idNumber: text('id_number'),
  ruc: text('ruc'),
  email: text('email'),
  phone: text('phone'),
  phoneCountry: text('phone_country'),
  phoneNumber: text('phone_number'),
  secondaryPhone: text('secondary_phone'),
  street: text('street'),
  city: text('city'),
  province: text('province'),
  deliveryInstructions: text('delivery_instructions'),
  // address: text('address'), // Campo obsoleto que será eliminado
  billingAddress: text('billing_address'),
  source: text('source').default('manual'),
  brand: text('brand'),
  status: text('status').default('active'),
  // NOTE: In the database, this column is actually JSONB type, not text[].
  // When working with this field, use sql`'["value1", "value2"]'::jsonb` for direct insertions
  tags: text('tags').array(),
  totalValue: text('total_value').default('0.00'),
  assignedUserId: integer('assigned_user_id'),
  lastPurchase: timestamp('last_purchase'),
  wooCommerceId: integer('wooCommerceId'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name"), // Campo computado a partir de firstName + lastName (nullable para permitir migración)
  firstName: text("first_name").notNull(), // Requerido: nombre del cliente o lead
  lastName: text("last_name").notNull(), // Requerido: apellido del cliente o lead
  idNumber: text("id_number"), 
  email: text("email"),
  phone: text("phone"),
  phoneCountry: text("phone_country"),
  phoneNumber: text("phone_number"), 
  street: text("street"),
  city: text("city"),
  province: text("province"),
  deliveryInstructions: text("delivery_instructions"),
  status: text("status").notNull().default(leadStatusEnum.NEW),
  priority: text("priority").default(priorityEnum.MEDIUM), 
  source: text("source").notNull().default(sourceEnum.INSTAGRAM),
  brand: text("brand").default(brandEnum.SLEEPWEAR),
  brandInterest: text("brand_interest"), 
  notes: text("notes"),
  assignedUserId: integer("assigned_user_id").references(() => crmUsers.id), 
  communicationPreference: text("communication_preference"), 
  convertedToCustomer: boolean("converted_to_customer").default(false),
  convertedCustomerId: integer("converted_customer_id").references(() => customers.id),
  lastContact: timestamp("last_contact"),
  nextFollowUp: timestamp("next_follow_up"),
  customerLifecycleStage: text("customer_lifecycle_stage"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const leadActivities = pgTable("lead_activities", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => leads.id),
  type: text("type").notNull(),
  title: text("title"), 
  notes: text("notes"),
  status: text("status").default(activityStatusEnum.PENDING), 
  priority: text("priority").default(priorityEnum.MEDIUM), 
  dueDate: timestamp("due_date"), 
  completedDate: timestamp("completed_date"), 
  assignedUserId: integer("assigned_user_id").references(() => crmUsers.id), 
  result: text("result"), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Define product categories table
export const productCategories = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  slug: text("slug").notNull().unique(),
  brand: text("brand").default(brandEnum.SLEEPWEAR),
  wooCommerceCategoryId: integer("wooCommerceCategoryId"), 
  parentCategoryId: integer("parent_category_id"), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Define product status enum values
export const productStatusEnum = {
  ACTIVE: 'active',
  DRAFT: 'draft',
  DISCONTINUED: 'discontinued',
} as const;

// Nueva tabla para productos
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  description: text("description"),
  categoryId: integer("category_id").references(() => productCategories.id),
  price: text("price").notNull(),
  priceDiscount: text("price_discount"), 
  stock: integer("stock").default(0),
  brand: text("brand").default(brandEnum.SLEEPWEAR),
  wooCommerceId: integer("wooCommerceId"), 
  wooCommerceParentId: integer("wooCommerceParentId"), 
  wooCommerceUrl: text("wooCommerceUrl"), 
  active: boolean("active").default(true),
  status: text("status").default(productStatusEnum.ACTIVE), 
  productType: text("product_type").default('simple'), 
  weight: text("weight"), 
  dimensions: text("dimensions").default(sql`'{}'`), 
  images: text("images").default(sql`'[]'`), 
  attributes: text("attributes").default(sql`'{}'`), 
  variants: text("variants").default(sql`'[]'`), 
  relatedProducts: text("related_products").default(sql`'[]'`), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Nueva tabla para órdenes/pedidos
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id),
  leadId: integer("lead_id").references(() => leads.id), 
  orderNumber: text("order_number").unique(), 
  totalAmount: text("total_amount").notNull(),
  subtotal: text("subtotal"), 
  tax: text("tax").default("0"), 
  discount: text("discount").default("0"), 
  shippingCost: text("shipping_cost").default("0"), 
  status: text("status").default(orderStatusEnum.NEW),
  paymentStatus: text("payment_status").default(paymentStatusEnum.PENDING),
  paymentMethod: text("payment_method"),
  paymentDetails: text("payment_details").default(sql`'{}'`), 
  paymentDate: timestamp("payment_date"), 
  source: text("source").default(sourceEnum.WEBSITE),
  isFromWebForm: boolean("is_from_web_form").default(false), 
  wooCommerceId: integer("wooCommerceId"), 
  trackingNumber: text("tracking_number"), 
  shippingMethod: text("shipping_method"), 
  brand: text("brand").default(brandEnum.SLEEPWEAR),
  shippingAddress: text("shipping_address").default(sql`'{}'`), 
  billingAddress: text("billing_address").default(sql`'{}'`), 
  couponCode: text("coupon_code"), 
  assignedUserId: integer("assigned_user_id").references(() => crmUsers.id), 
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Nueva tabla para items de órdenes (detalles de productos en cada orden)
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  productId: integer("product_id").references(() => products.id),
  productName: text("product_name").notNull(), 
  quantity: integer("quantity").notNull().default(1),
  unitPrice: text("unit_price").notNull(),
  discount: text("discount").default("0"),
  subtotal: text("subtotal").notNull(),
  attributes: text("attributes").default(sql`'{}'`), 
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  orderId: integer("order_id").references(() => orders.id), 
  amount: text("amount").notNull(),
  status: text("status").notNull(),
  paymentMethod: text("payment_method"),
  brand: text("brand").default(brandEnum.SLEEPWEAR),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// WhatsApp message table for storing message interactions
export const whatsappMessages = pgTable("whatsapp_messages", {
  id: serial("id").primaryKey(),
  messageSid: text("message_sid"), 
  fromNumber: text("from_number").notNull(), 
  toNumber: text("to_number").notNull(), 
  messageBody: text("message_body").notNull(), 
  direction: text("direction").notNull(), 
  customerId: integer("customer_id").references(() => customers.id), 
  leadId: integer("lead_id").references(() => leads.id), 
  mediaUrl: text("media_url"), 
  status: text("status").default("delivered"), 
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Nueva tabla para CRM Users (Usuarios internos)
export const crmUsers = pgTable("crm_users", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(), 
  role: text("role").notNull().default(userRoleEnum.SALES),
  active: boolean("active").default(true).notNull(),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Nueva tabla para Oportunidades (Pipeline)
export const opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  customerId: integer("customer_id").references(() => customers.id),
  leadId: integer("lead_id").references(() => leads.id),
  estimatedValue: text("estimated_value").notNull(),
  probability: integer("probability"), 
  status: text("status").notNull().default(opportunityStatusEnum.NEGOTIATION),
  stage: text("stage").notNull(), 
  assignedUserId: integer("assigned_user_id").references(() => crmUsers.id),
  brand: text("brand").default(brandEnum.SLEEPWEAR), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  estimatedCloseDate: timestamp("estimated_close_date"),
  notes: text("notes"),
  productsInterested: text("products_interested").default(sql`'[]'`), 
  nextActionDate: timestamp("next_action_date") 
});

// Nueva tabla para Interacciones (comunicaciones con clientes/leads)
export const interactions = pgTable("interactions", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id),
  leadId: integer("lead_id").references(() => leads.id),
  opportunityId: integer("opportunity_id").references(() => opportunities.id),
  type: text("type").notNull().default(interactionTypeEnum.QUERY),
  channel: text("channel").notNull().default(interactionChannelEnum.WHATSAPP),
  content: text("content").notNull(), 
  attachments: text("attachments").default(sql`'[]'`), 
  assignedUserId: integer("assigned_user_id").references(() => crmUsers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isResolved: boolean("is_resolved").default(false),
  resolutionNotes: text("resolution_notes")
});

// Nueva tabla para Actividades (Calendario CRM)
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().default(activityTypeEnum.TASK),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  customerId: integer("customer_id").references(() => customers.id),
  leadId: integer("lead_id").references(() => leads.id),
  opportunityId: integer("opportunity_id").references(() => opportunities.id),
  assignedUserId: integer("assigned_user_id").references(() => crmUsers.id).notNull(),
  status: text("status").notNull().default(activityStatusEnum.PENDING),
  priority: text("priority").default(priorityEnum.MEDIUM),
  reminderTime: timestamp("reminder_time"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Define relations
export const customerRelations = relations(customers, ({ many }) => ({
  sales: many(sales),
  orders: many(orders),
  leads: many(leads, { relationName: "convertedLeads" }),
  whatsappMessages: many(whatsappMessages, { relationName: "customerMessages" }),
  opportunities: many(opportunities),
  interactions: many(interactions),
  activities: many(activities)
}));

export const leadRelations = relations(leads, ({ one, many }) => ({
  convertedCustomer: one(customers, {
    fields: [leads.convertedCustomerId],
    references: [customers.id],
    relationName: "convertedLeads"
  }),
  activities: many(leadActivities),
  orders: many(orders),
  whatsappMessages: many(whatsappMessages, { relationName: "leadMessages" }),
  opportunities: many(opportunities),
  interactions: many(interactions),
  crmActivities: many(activities)
}));

export const leadActivityRelations = relations(leadActivities, ({ one }) => ({
  lead: one(leads, {
    fields: [leadActivities.leadId],
    references: [leads.id]
  }),
  assignedUser: one(crmUsers, {
    fields: [leadActivities.assignedUserId],
    references: [crmUsers.id]
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
  assignedUser: one(crmUsers, {
    fields: [orders.assignedUserId],
    references: [crmUsers.id]
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

export const whatsappMessageRelations = relations(whatsappMessages, ({ one }) => ({
  customer: one(customers, {
    fields: [whatsappMessages.customerId],
    references: [customers.id],
    relationName: "customerMessages"
  }),
  lead: one(leads, {
    fields: [whatsappMessages.leadId],
    references: [leads.id],
    relationName: "leadMessages"
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

// Relaciones para usuarios CRM
export const crmUserRelations = relations(crmUsers, ({ many }) => ({
  opportunities: many(opportunities, { relationName: "assignedOpportunities" }),
  interactions: many(interactions, { relationName: "assignedInteractions" }),
  activities: many(activities, { relationName: "assignedActivities" }),
  leadActivities: many(leadActivities)
}));

// Relaciones para oportunidades
export const opportunityRelations = relations(opportunities, ({ one, many }) => ({
  customer: one(customers, {
    fields: [opportunities.customerId],
    references: [customers.id]
  }),
  lead: one(leads, {
    fields: [opportunities.leadId],
    references: [leads.id]
  }),
  assignedUser: one(crmUsers, {
    fields: [opportunities.assignedUserId],
    references: [crmUsers.id],
    relationName: "assignedOpportunities"
  }),
  interactions: many(interactions),
  activities: many(activities)
}));

// Relaciones para interacciones
export const interactionRelations = relations(interactions, ({ one }) => ({
  customer: one(customers, {
    fields: [interactions.customerId],
    references: [customers.id]
  }),
  lead: one(leads, {
    fields: [interactions.leadId],
    references: [leads.id]
  }),
  opportunity: one(opportunities, {
    fields: [interactions.opportunityId],
    references: [opportunities.id]
  }),
  assignedUser: one(crmUsers, {
    fields: [interactions.assignedUserId],
    references: [crmUsers.id],
    relationName: "assignedInteractions"
  })
}));

// Relaciones para actividades
export const activityRelations = relations(activities, ({ one }) => ({
  customer: one(customers, {
    fields: [activities.customerId],
    references: [customers.id]
  }),
  lead: one(leads, {
    fields: [activities.leadId],
    references: [leads.id]
  }),
  opportunity: one(opportunities, {
    fields: [activities.opportunityId],
    references: [opportunities.id]
  }),
  assignedUser: one(crmUsers, {
    fields: [activities.assignedUserId],
    references: [crmUsers.id],
    relationName: "assignedActivities"
  })
}));

// Schemas for validation
export const insertLeadSchema = z.object({
  // name field remains as an optional computed field (firstName + lastName)
  name: z.string().optional(),
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
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

// Personalizado para garantizar que firstName y lastName son obligatorios
export const insertCustomerSchema = z.object({
  id: z.number().optional(),
  name: z.string().optional(), // Campo computado a partir de firstName + lastName
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  idNumber: z.string().optional().nullable(),
  email: z.string().email("Email inválido").optional().nullable(),
  phone: z.string().optional().nullable(),
  phoneCountry: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  secondaryPhone: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  deliveryInstructions: z.string().optional().nullable(),
  source: z.string().optional().default('manual'),
  brand: z.string().optional().default('sleepwear'),
  status: z.string().optional().default('active'),
  notes: z.string().optional().nullable(),
  type: z.string().optional().default('person'),
  billingAddress: z.any().optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});
export const insertSaleSchema = createInsertSchema(sales);
export const insertWebhookSchema = createInsertSchema(webhooks);
export const insertLeadActivitySchema = createInsertSchema(leadActivities);
export const insertProductSchema = createInsertSchema(products);
export const insertOrderSchema = createInsertSchema(orders);
export const insertOrderItemSchema = createInsertSchema(orderItems);
export const insertProductCategorySchema = createInsertSchema(productCategories);
export const insertWhatsappMessageSchema = createInsertSchema(whatsappMessages);
export const insertCrmUserSchema = createInsertSchema(crmUsers);
export const insertOpportunitySchema = createInsertSchema(opportunities);
export const insertInteractionSchema = createInsertSchema(interactions);
export const insertActivitySchema = createInsertSchema(activities);
export const selectCustomerSchema = createSelectSchema(customers);
export const selectSaleSchema = createSelectSchema(sales);
export const selectWebhookSchema = createSelectSchema(webhooks);
export const selectLeadSchema = createSelectSchema(leads);
export const selectWhatsappMessageSchema = createSelectSchema(whatsappMessages);

export const selectProductSchema = createSelectSchema(products);
export const selectOrderSchema = createSelectSchema(orders);
export const selectOrderItemSchema = createSelectSchema(orderItems);
export const selectProductCategorySchema = createSelectSchema(productCategories);
export const selectCrmUserSchema = createSelectSchema(crmUsers);
export const selectOpportunitySchema = createSelectSchema(opportunities);
export const selectInteractionSchema = createSelectSchema(interactions);
export const selectActivitySchema = createSelectSchema(activities);
export const selectLeadActivitySchema = createSelectSchema(leadActivities);
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
export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
export type CrmUser = typeof crmUsers.$inferSelect;
export type Opportunity = typeof opportunities.$inferSelect;
export type Interaction = typeof interactions.$inferSelect;
export type Activity = typeof activities.$inferSelect;