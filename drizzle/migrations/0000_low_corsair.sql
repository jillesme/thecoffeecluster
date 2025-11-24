CREATE TYPE "public"."roast_level" AS ENUM('Light', 'Medium', 'Dark', 'Espresso');--> statement-breakpoint
CREATE TABLE "coffee_beans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"image_key" text,
	"tasting_notes" text,
	"price_in_cents" integer NOT NULL,
	"roast_level" "roast_level" DEFAULT 'Medium',
	"supplier_id" integer
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"country" text NOT NULL,
	"is_fair_trade" boolean DEFAULT false,
	"website_url" text
);
--> statement-breakpoint
ALTER TABLE "coffee_beans" ADD CONSTRAINT "coffee_beans_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;