CREATE TABLE "email_suppression" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email_hash" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_suppression_email_hash_unique" UNIQUE("email_hash"),
	CONSTRAINT "email_suppression_reason_check" CHECK ("email_suppression"."reason" in ('claim_removal', 'manual'))
);
