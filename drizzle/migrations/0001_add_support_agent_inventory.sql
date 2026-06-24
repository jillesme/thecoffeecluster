CREATE TABLE "coffee_inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"coffee_bean_id" integer NOT NULL,
	"quantity_available" integer DEFAULT 0 NOT NULL,
	"reserved_quantity" integer DEFAULT 0 NOT NULL,
	"restock_eta" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wholesale_leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"company_name" text,
	"location" text,
	"estimated_volume" text,
	"original_message" text NOT NULL,
	"agent_summary" text,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coffee_inventory" ADD CONSTRAINT "coffee_inventory_coffee_bean_id_coffee_beans_id_fk" FOREIGN KEY ("coffee_bean_id") REFERENCES "public"."coffee_beans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "coffee_inventory_coffee_bean_id_unique" ON "coffee_inventory" USING btree ("coffee_bean_id");