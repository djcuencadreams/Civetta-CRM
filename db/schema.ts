import { pgTable, text, serial, integer, timestamp, decimal, boolean, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import * as z from 'zod';

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
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  source: varchar("source", { length: 50 }).default('website'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  phoneCountry: text("phone_country"),
  street: text("street"),
  city: text("city"),
  province: text("province"),
  deliveryInstructions: text("delivery_instructions"),
  status: varchar("status", { length: 50 }).notNull().default('new'),
  source: varchar("source", { length: 50 }).notNull().default('website'),
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

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull(),
  paymentMethod: text("payment_method"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Define relations
export const customerRelations = relations(customers, ({ many }) => ({
  sales: many(sales),
  leads: many(leads, { relationName: "convertedLeads" })
}));

export const leadRelations = relations(leads, ({ one }) => ({
  convertedCustomer: one(customers, {
    fields: [leads.convertedCustomerId],
    references: [customers.id],
    relationName: "convertedLeads"
  })
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
  })
}));

// Schemas for validation
export const insertLeadSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Email inválido").optional().nullable(),
  phone: z.string().optional().nullable(),
  phoneCountry: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  deliveryInstructions: z.string().optional().nullable(),
  status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']).default('new'),
  source: z.enum(['website', 'referral', 'social_media', 'email', 'cold_call', 'event', 'other']).default('website'),
  notes: z.string().optional().nullable(),
  lastContact: z.string().optional().nullable().transform(val => val ? new Date(val) : null),
  nextFollowUp: z.string().optional().nullable().transform(val => val ? new Date(val) : null)
});

export const insertCustomerSchema = createInsertSchema(customers);
export const insertSaleSchema = createInsertSchema(sales);
export const insertWebhookSchema = createInsertSchema(webhooks);

export const selectCustomerSchema = createSelectSchema(customers);
export const selectSaleSchema = createSelectSchema(sales);
export const selectWebhookSchema = createSelectSchema(webhooks);
export const selectLeadSchema = createSelectSchema(leads);

// Type exports
export type Customer = typeof customers.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type Webhook = typeof webhooks.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type LeadActivity = typeof leadActivities.$inferSelect;