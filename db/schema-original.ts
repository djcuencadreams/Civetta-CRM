import { pgTable, text, serial, integer, timestamp, decimal, boolean, varchar, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import * as z from 'zod';

// Define the brand enum values
export const brandEnum = {
  SLEEPWEAR: 'sleepwear',
  BRIDE: 'bride',
} as const;

// Define source enum values
export const sourceEnum = {
  INSTAGRAM: 'instagram',
  FACEBOOK: 'facebook',
  WEBSITE: 'website',
  WHATSAPP: 'whatsapp',
  REFERRAL: 'referral',
  OTHER: 'other',
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
} as const;

// Define webhooks table
export const webhooks = pgTable("webhooks", {
  id: serial("id").primaryKey(),
  endpoint: text("endpoint").notNull(),
  secret: text("secret"),
  events: text("events").array(),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Define customers table
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  phoneCountry: text("phone_country"),
  phoneNumber: text("phone_number"), // Store the phone number without country code
  street: text("street"),
  city: text("city"),
  province: text("province"),
  deliveryInstructions: text("delivery_instructions"),
  address: text("address"), // Legacy field for backward compatibility
  source: varchar("source", { length: 50 }),
  brand: varchar("brand", { length: 20 }).default(brandEnum.SLEEPWEAR),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Define leads table
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
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

// Define sales table
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
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
  sales: many(sales)
}));

export const leadRelations = relations(leads, ({ one, many }) => ({
  convertedCustomer: one(customers, {
    fields: [leads.convertedCustomerId],
    references: [customers.id],
    relationName: "convertedLeads"
  }),
  activities: many(leadActivities)
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

// Define Zod schemas for validation
export const insertLeadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  phoneCountry: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  deliveryInstructions: z.string().optional().nullable(),
  status: z.string().optional(),
  source: z.string().optional(),
  brand: z.string().optional(),
  notes: z.string().optional().nullable(),
});

export const insertCustomerSchema = createInsertSchema(customers);
export const insertSaleSchema = createInsertSchema(sales);
export const insertWebhookSchema = createInsertSchema(webhooks);

export const selectCustomerSchema = createSelectSchema(customers);
export const selectSaleSchema = createSelectSchema(sales);
export const selectWebhookSchema = createSelectSchema(webhooks);
export const selectLeadSchema = createSelectSchema(leads);

// Export types
export type Customer = typeof customers.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type Webhook = typeof webhooks.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type LeadActivity = typeof leadActivities.$inferSelect;