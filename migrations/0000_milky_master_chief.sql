-- Add phone_number column to customers table
ALTER TABLE IF EXISTS "customers" ADD COLUMN IF NOT EXISTS "phone_number" text;

-- Add firstName, lastName, and phoneNumber columns to leads table
ALTER TABLE IF EXISTS "leads" ADD COLUMN IF NOT EXISTS "first_name" text;
ALTER TABLE IF EXISTS "leads" ADD COLUMN IF NOT EXISTS "last_name" text;
ALTER TABLE IF EXISTS "leads" ADD COLUMN IF NOT EXISTS "phone_number" text;

--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leads" ADD CONSTRAINT "leads_converted_customer_id_customers_id_fk" FOREIGN KEY ("converted_customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
