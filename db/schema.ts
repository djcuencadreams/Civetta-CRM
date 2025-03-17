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

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  type: varchar("type", { length: 20 }).default(customerTypeEnum.PERSON), // Tipo de cliente (Persona o Empresa)
  idNumber: text("id_number"), // Cédula/Pasaporte for invoicing and shipping
  email: text("email"),
  phone: text("phone"),
  phoneCountry: text("phone_country"),
  phoneNumber: text("phone_number"), // Store the phone number without country code
  secondaryPhone: text("secondary_phone"), // Teléfono secundario
  street: text("street"),
  city: text("city"),
  province: text("province"),
  deliveryInstructions: text("delivery_instructions"),
  address: text("address"), // Keeping for backward compatibility
  billingAddress: jsonb("billing_address").default({}), // Dirección de facturación separada
  source: varchar("source", { length: 50 }).default('instagram'),
  brand: varchar("brand", { length: 20 }).default(brandEnum.SLEEPWEAR),
  status: varchar("status", { length: 20 }).default(customerStatusEnum.ACTIVE), // Estado del cliente (Activo, Inactivo, VIP)
  tags: jsonb("tags").default([]), // Etiquetas del cliente
  totalValue: decimal("total_value", { precision: 10, scale: 2 }).default("0"), // Valor histórico comprado
  assignedUserId: integer("assigned_user_id").references(() => crmUsers.id), // Usuario asignado
  lastPurchase: timestamp("last_purchase"), // Fecha de última compra
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
  priority: varchar("priority", { length: 10 }).default(priorityEnum.MEDIUM), // Prioridad del lead (Alta, Media, Baja)
  source: varchar("source", { length: 50 }).notNull().default(sourceEnum.INSTAGRAM),
  brand: varchar("brand", { length: 20 }).default(brandEnum.SLEEPWEAR),
  brandInterest: varchar("brand_interest", { length: 50 }), // Marca específica de interés
  notes: text("notes"),
  assignedUserId: integer("assigned_user_id").references(() => crmUsers.id), // Usuario responsable del seguimiento
  communicationPreference: varchar("communication_preference", { length: 20 }), // Preferencia de comunicación
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
  title: text("title"), // Título o resumen de la actividad
  notes: text("notes"),
  status: varchar("status", { length: 20 }).default(activityStatusEnum.PENDING), // Estado de la actividad
  priority: varchar("priority", { length: 10 }).default(priorityEnum.MEDIUM), // Prioridad 
  dueDate: timestamp("due_date"), // Fecha límite
  completedDate: timestamp("completed_date"), // Fecha de completado
  assignedUserId: integer("assigned_user_id").references(() => crmUsers.id), // Usuario asignado
  result: text("result"), // Resultado de la actividad
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
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
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  priceDiscount: decimal("price_discount", { precision: 10, scale: 2 }), // Precio de oferta
  stock: integer("stock").default(0),
  brand: varchar("brand", { length: 20 }).default(brandEnum.SLEEPWEAR),
  wooCommerceId: integer("woocommerce_id"), // ID del producto en WooCommerce para sincronización
  wooCommerceParentId: integer("woocommerce_parent_id"), // ID del producto padre en WooCommerce (para variaciones)
  wooCommerceUrl: text("woocommerce_url"), // URL del producto en WooCommerce
  active: boolean("active").default(true),
  status: varchar("status", { length: 20 }).default(productStatusEnum.ACTIVE), // Estado del producto (Activo, Borrador, Descontinuado)
  productType: varchar("product_type", { length: 50 }).default('simple'), // Tipo de producto (simple, variable, variation)
  weight: decimal("weight", { precision: 10, scale: 2 }), // Peso del producto en kg
  dimensions: jsonb("dimensions").default({}), // Dimensiones como objeto JSON (height, width, length)
  images: jsonb("images").default([]), // URLs de imágenes como array JSON
  attributes: jsonb("attributes").default({}), // Atributos como objeto JSON (color, talla, etc.)
  variants: jsonb("variants").default([]), // Variaciones del producto
  relatedProducts: jsonb("related_products").default([]), // Productos relacionados (upsell, cross-sell)
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
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }), // Subtotal antes de impuestos y descuentos
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0"), // Impuesto aplicado
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"), // Descuento total aplicado
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).default("0"), // Costo de envío
  status: varchar("status", { length: 50 }).default(orderStatusEnum.NEW),
  paymentStatus: varchar("payment_status", { length: 50 }).default(paymentStatusEnum.PENDING),
  paymentMethod: varchar("payment_method", { length: 50 }),
  paymentDetails: jsonb("payment_details").default({}), // Detalles de pago (números de transacción, etc)
  paymentDate: timestamp("payment_date"), // Fecha de pago
  source: varchar("source", { length: 50 }).default(sourceEnum.WEBSITE),
  wooCommerceId: integer("woocommerce_id"), // ID del pedido en WooCommerce para sincronización
  trackingNumber: text("tracking_number"), // Número de seguimiento de envío
  shippingMethod: varchar("shipping_method", { length: 50 }), // Método de envío seleccionado
  brand: varchar("brand", { length: 20 }).default(brandEnum.SLEEPWEAR),
  shippingAddress: jsonb("shipping_address").default({}), // Dirección de envío como objeto JSON
  billingAddress: jsonb("billing_address").default({}), // Dirección de facturación como objeto JSON
  couponCode: text("coupon_code"), // Código de cupón aplicado
  assignedUserId: integer("assigned_user_id").references(() => crmUsers.id), // Usuario que maneja el pedido
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

// WhatsApp message table for storing message interactions
export const whatsappMessages = pgTable("whatsapp_messages", {
  id: serial("id").primaryKey(),
  messageSid: text("message_sid"), // Twilio message SID
  fromNumber: text("from_number").notNull(), // Phone number that sent the message
  toNumber: text("to_number").notNull(), // Phone number that received the message
  messageBody: text("message_body").notNull(), // Content of the message
  direction: varchar("direction", { length: 10 }).notNull(), // 'incoming' or 'outgoing'
  customerId: integer("customer_id").references(() => customers.id), // Associated customer if any
  leadId: integer("lead_id").references(() => leads.id), // Associated lead if any
  mediaUrl: text("media_url"), // URL of any media attached to the message
  status: varchar("status", { length: 20 }).default("delivered"), // Message status: delivered, failed, etc.
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Nueva tabla para CRM Users (Usuarios internos)
export const crmUsers = pgTable("crm_users", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(), // Se almacenará encriptada
  role: varchar("role", { length: 20 }).notNull().default(userRoleEnum.SALES),
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
  estimatedValue: decimal("estimated_value", { precision: 10, scale: 2 }).notNull(),
  probability: integer("probability"), // porcentaje de probabilidad
  status: varchar("status", { length: 50 }).notNull().default(opportunityStatusEnum.NEGOTIATION),
  stage: varchar("stage", { length: 50 }).notNull(), // Etapa personalizada del pipeline
  assignedUserId: integer("assigned_user_id").references(() => crmUsers.id),
  brand: varchar("brand", { length: 20 }).default(brandEnum.SLEEPWEAR), // Marca (Sleepwear o Bride)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  estimatedCloseDate: timestamp("estimated_close_date"),
  notes: text("notes"),
  productsInterested: jsonb("products_interested").default([]), // Productos en los que está interesado
  nextActionDate: timestamp("next_action_date") // Fecha próxima acción
});

// Nueva tabla para Interacciones (comunicaciones con clientes/leads)
export const interactions = pgTable("interactions", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id),
  leadId: integer("lead_id").references(() => leads.id),
  opportunityId: integer("opportunity_id").references(() => opportunities.id),
  type: varchar("type", { length: 50 }).notNull().default(interactionTypeEnum.QUERY),
  channel: varchar("channel", { length: 50 }).notNull().default(interactionChannelEnum.WHATSAPP),
  content: text("content").notNull(), // Contenido de la interacción
  attachments: jsonb("attachments").default([]), // URLs o datos de archivos adjuntos
  assignedUserId: integer("assigned_user_id").references(() => crmUsers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isResolved: boolean("is_resolved").default(false),
  resolutionNotes: text("resolution_notes")
});

// Nueva tabla para Actividades (Calendario CRM)
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 50 }).notNull().default(activityTypeEnum.TASK),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  customerId: integer("customer_id").references(() => customers.id),
  leadId: integer("lead_id").references(() => leads.id),
  opportunityId: integer("opportunity_id").references(() => opportunities.id),
  assignedUserId: integer("assigned_user_id").references(() => crmUsers.id).notNull(),
  status: varchar("status", { length: 20 }).notNull().default(activityStatusEnum.PENDING),
  priority: varchar("priority", { length: 10 }).default(priorityEnum.MEDIUM),
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
