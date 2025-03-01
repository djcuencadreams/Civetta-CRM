ALTER TABLE "customers" ALTER COLUMN "source" SET DEFAULT 'instagram';--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "source" SET DEFAULT 'instagram';--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "id_number" text;