CREATE TABLE "wholesale_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"invitation_summary" text,
	"lead_id" integer,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wholesale_invitations" ADD CONSTRAINT "wholesale_invitations_lead_id_wholesale_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."wholesale_leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "wholesale_invitations_thread_id_unique" ON "wholesale_invitations" USING btree ("thread_id");