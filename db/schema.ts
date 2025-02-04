import { pgTable, text, serial, integer, timestamp, decimal, boolean, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import * as z from 'zod';

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phoneCountry: varchar("phone_country", { length: 10 }),
  phoneNumber: varchar("phone_number", { length: 15 }),
  status: varchar("status", { length: 50 }).notNull().default('new'),
  lastContact: timestamp("last_contact"),
  nextFollowUp: timestamp("next_follow_up"),
  customerLifecycleStage: varchar("customer_lifecycle_stage", { length: 50 }),
  notes: text("notes"),
  street: text("street"),
  city: text("city"),
  province: varchar("province", { length: 50 }),
  deliveryInstructions: text("delivery_instructions"),
  convertedToCustomer: boolean("converted_to_customer").default(false),
  convertedCustomerId: integer("converted_customer_id").references(() => customers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const leadActivities = pgTable("lead_activities", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  source: varchar("source", { length: 50 }).default('website'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull(),
  paymentMethod: text("payment_method"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const webhooks = pgTable("webhooks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  event: text("event").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Define relationships
export const salesRelations = relations(sales, ({ one }) => ({
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id]
  })
}));

export const customerRelations = relations(customers, ({ many }) => ({
  sales: many(sales)
}));

export const leadRelations = relations(leads, ({ many }) => ({
  activities: many(leadActivities)
}));

export const leadActivityRelations = relations(leadActivities, ({ one }) => ({
  lead: one(leads, {
    fields: [leadActivities.leadId],
    references: [leads.id]
  })
}));

// Schema validations
export const insertSaleSchema = z.object({
  customerId: z.string().transform(val => parseInt(val, 10)),
  products: z.array(z.object({
    name: z.string().min(1, "Nombre del producto es requerido"),
    category: z.string().min(1, "Categoría es requerida"),
    amount: z.string().transform(val => {
      const num = Number(val);
      if (isNaN(num)) throw new Error("El precio debe ser un número válido");
      return num;
    }),
    quantity: z.string().transform(val => {
      const num = Number(val);
      if (isNaN(num) || num < 1) throw new Error("La cantidad debe ser un número válido mayor a 0");
      return num;
    })
  })),
  paymentMethod: z.string(),
  notes: z.string().optional()
});

export const insertCustomerSchema = z.object({
  name: z.string().min(1, "Nombre es requerido"),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  source: z.enum(['website', 'referral', 'social_media', 'email', 'cold_call', 'event', 'other']).default('website')
});

export const insertWebhookSchema = z.object({
  name: z.string().min(1, "Nombre es requerido"),
  url: z.string().url("URL inválida"),
  event: z.string().min(1, "Evento es requerido"),
  active: z.boolean().default(true)
});

export const insertLeadSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Email inválido").optional().nullable(),
  phoneCountry: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']).default('new'),
  notes: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  deliveryInstructions: z.string().optional().nullable(),
  lastContact: z.string().optional().nullable().transform(val => val ? new Date(val) : null),
  nextFollowUp: z.string().optional().nullable().transform(val => val ? new Date(val) : null)
});

export const selectCustomerSchema = createSelectSchema(customers);
export const selectSaleSchema = createSelectSchema(sales);
export const selectWebhookSchema = createSelectSchema(webhooks);
export const selectLeadSchema = createSelectSchema(leads);

export type Customer = typeof customers.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type Webhook = typeof webhooks.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type LeadActivity = typeof leadActivities.$inferSelect;