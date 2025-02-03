
import { pgTable, text, serial, integer, timestamp, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import * as z from 'zod';

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phoneCountry: text("phone_country"),
  phoneNumber: text("phone_number"),
  street: text("street"),
  city: text("city"),
  province: text("province"),
  deliveryInstructions: text("delivery_instructions"),
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

export const salesRelations = relations(sales, ({ one }) => ({
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id]
  })
}));

export const customerRelations = relations(customers, ({ many }) => ({
  sales: many(sales)
}));

export const insertCustomerSchema = createInsertSchema(customers);
export const selectCustomerSchema = createSelectSchema(customers);
export const insertSaleSchema = createInsertSchema(sales);
export const selectSaleSchema = createSelectSchema(sales);
export const insertWebhookSchema = createInsertSchema(webhooks);
export const selectWebhookSchema = createSelectSchema(webhooks);

export type Customer = typeof customers.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type Webhook = typeof webhooks.$inferSelect;
