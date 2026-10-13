CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE TABLE "contact_message" (
	"id" uuid PRIMARY KEY NOT NULL,
	"entry_id" uuid NOT NULL,
	"sender_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entry_view_day" (
	"entry_id" uuid NOT NULL,
	"day" date NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "entry_view_day_entry_id_day_pk" PRIMARY KEY("entry_id","day")
);
--> statement-breakpoint
CREATE TABLE "usage_counter" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geocode_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"hits" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_address" (
	"street_id" integer NOT NULL,
	"house_number" integer NOT NULL,
	"suffix" text DEFAULT '' NOT NULL,
	"lon" real NOT NULL,
	"lat" real NOT NULL,
	CONSTRAINT "hr_address_street_id_house_number_suffix_pk" PRIMARY KEY("street_id","house_number","suffix")
);
--> statement-breakpoint
CREATE TABLE "hr_street" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"settlement" text NOT NULL,
	"postcode" text NOT NULL,
	"search_text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"idempotency_key" text,
	"priority" integer DEFAULT 5 NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"error" text,
	"locked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "job_type_check" CHECK ("job"."type" in ('translate', 'email', 'geocode_retry')),
	CONSTRAINT "job_status_check" CHECK ("job"."status" in ('queued', 'running', 'done', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "link" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_id" uuid NOT NULL,
	"to_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"symmetric" boolean NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"year" integer,
	"end_year" integer,
	"project" text,
	"note" text,
	"proposed_by" uuid,
	"proposed_by_entry_id" uuid,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "link_not_self_check" CHECK ("link"."from_id" <> "link"."to_id"),
	CONSTRAINT "link_symmetric_order_check" CHECK (not "link"."symmetric" or "link"."from_id" < "link"."to_id"),
	CONSTRAINT "link_kind_check" CHECK ("link"."kind" in ('collaborated', 'eu_partner', 'member_of', 'supplier', 'mentor')),
	CONSTRAINT "link_symmetric_kind_check" CHECK ("link"."symmetric" = ("link"."kind" in ('collaborated', 'eu_partner'))),
	CONSTRAINT "link_status_check" CHECK ("link"."status" in ('proposed', 'confirmed', 'rejected', 'withdrawn'))
);
--> statement-breakpoint
CREATE TABLE "link_evidence" (
	"id" uuid PRIMARY KEY NOT NULL,
	"link_id" uuid NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_log" (
	"id" uuid PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"user_id" uuid,
	"source" text NOT NULL,
	"action" text NOT NULL,
	"changed_fields" text[] DEFAULT '{}' NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"reverted_by_log_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "change_log_entity_check" CHECK ("change_log"."entity_type" in ('entry', 'opportunity', 'link', 'tag', 'user')),
	CONSTRAINT "change_log_source_check" CHECK ("change_log"."source" in ('owner', 'admin', 'import', 'system')),
	CONSTRAINT "change_log_action_check" CHECK ("change_log"."action" in ('create', 'update', 'status_change', 'revert', 'delete'))
);
--> statement-breakpoint
CREATE TABLE "review_item" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reason_code" text,
	"note_to_applicant" text,
	"decided_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	CONSTRAINT "review_item_entity_check" CHECK ("review_item"."entity_type" in ('entry', 'opportunity', 'link', 'tag', 'user')),
	CONSTRAINT "review_item_type_check" CHECK ("review_item"."type" in ('application', 'untrusted_edit', 'opportunity', 'tag', 'report', 'link_dispute')),
	CONSTRAINT "review_item_status_check" CHECK ("review_item"."status" in ('open', 'approved', 'rejected', 'dismissed')),
	CONSTRAINT "review_item_reason_check" CHECK ("review_item"."reason_code" in ('incomplete', 'duplicate', 'out_of_scope', 'unverifiable', 'spam', 'other'))
);
--> statement-breakpoint
CREATE TABLE "opportunity" (
	"id" uuid PRIMARY KEY NOT NULL,
	"entry_id" uuid NOT NULL,
	"type" text NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"body" jsonb NOT NULL,
	"body_text" text DEFAULT '' NOT NULL,
	"source_locale" text NOT NULL,
	"remote_ok" boolean DEFAULT false NOT NULL,
	"deadline" date,
	"expires_at" timestamp with time zone NOT NULL,
	"renewals" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"closed_reason" text,
	"closed_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunity_source_locale_check" CHECK ("opportunity"."source_locale" in ('hr', 'en')),
	CONSTRAINT "opportunity_type_check" CHECK ("opportunity"."type" in ('seeking', 'offering')),
	CONSTRAINT "opportunity_category_check" CHECK ("opportunity"."category" in ('partner', 'skill', 'space', 'service', 'funding_call_partner', 'other')),
	CONSTRAINT "opportunity_status_check" CHECK ("opportunity"."status" in ('pending', 'published', 'closed', 'rejected', 'removed'))
);
--> statement-breakpoint
CREATE TABLE "opportunity_tag" (
	"opportunity_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "opportunity_tag_opportunity_id_tag_id_pk" PRIMARY KEY("opportunity_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "entry_tag" (
	"entry_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"field" text NOT NULL,
	CONSTRAINT "entry_tag_entry_id_tag_id_field_pk" PRIMARY KEY("entry_id","tag_id","field"),
	CONSTRAINT "entry_tag_field_check" CHECK ("entry_tag"."field" in ('topic', 'offering', 'seeking'))
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"label_en" text NOT NULL,
	"label_hr" text NOT NULL,
	"aliases_en" text[] DEFAULT '{}' NOT NULL,
	"aliases_hr" text[] DEFAULT '{}' NOT NULL,
	"parent_id" uuid,
	"canonical_id" uuid,
	"source_uri" text,
	"status" text DEFAULT 'active' NOT NULL,
	"suggested_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tag_status_check" CHECK ("tag"."status" in ('active', 'suggested', 'rejected'))
);
--> statement-breakpoint
CREATE TABLE "translation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"field" text NOT NULL,
	"locale" text NOT NULL,
	"text" text NOT NULL,
	"origin" text NOT NULL,
	"provider" text,
	"source_hash" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "translation_entity_field_locale_unique" UNIQUE("entity_type","entity_id","field","locale"),
	CONSTRAINT "translation_entity_check" CHECK ("translation"."entity_type" in ('entry', 'opportunity')),
	CONSTRAINT "translation_locale_check" CHECK ("translation"."locale" in ('hr', 'en')),
	CONSTRAINT "translation_origin_check" CHECK ("translation"."origin" in ('machine', 'human'))
);
--> statement-breakpoint
ALTER TABLE "contact_message" ADD CONSTRAINT "contact_message_entry_id_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_view_day" ADD CONSTRAINT "entry_view_day_entry_id_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_address" ADD CONSTRAINT "hr_address_street_id_hr_street_id_fk" FOREIGN KEY ("street_id") REFERENCES "public"."hr_street"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link" ADD CONSTRAINT "link_from_id_entry_id_fk" FOREIGN KEY ("from_id") REFERENCES "public"."entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link" ADD CONSTRAINT "link_to_id_entry_id_fk" FOREIGN KEY ("to_id") REFERENCES "public"."entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link" ADD CONSTRAINT "link_proposed_by_user_id_fk" FOREIGN KEY ("proposed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link" ADD CONSTRAINT "link_proposed_by_entry_id_entry_id_fk" FOREIGN KEY ("proposed_by_entry_id") REFERENCES "public"."entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link" ADD CONSTRAINT "link_decided_by_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_evidence" ADD CONSTRAINT "link_evidence_link_id_link_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."link"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_log" ADD CONSTRAINT "change_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_log" ADD CONSTRAINT "change_log_reverted_by_log_id_change_log_id_fk" FOREIGN KEY ("reverted_by_log_id") REFERENCES "public"."change_log"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_item" ADD CONSTRAINT "review_item_decided_by_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity" ADD CONSTRAINT "opportunity_entry_id_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_tag" ADD CONSTRAINT "opportunity_tag_opportunity_id_opportunity_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_tag" ADD CONSTRAINT "opportunity_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_tag" ADD CONSTRAINT "entry_tag_entry_id_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_tag" ADD CONSTRAINT "entry_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag" ADD CONSTRAINT "tag_parent_id_tag_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tag"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag" ADD CONSTRAINT "tag_canonical_id_tag_id_fk" FOREIGN KEY ("canonical_id") REFERENCES "public"."tag"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag" ADD CONSTRAINT "tag_suggested_by_user_id_fk" FOREIGN KEY ("suggested_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_message_sender_hash_created_at_index" ON "contact_message" USING btree ("sender_hash","created_at");--> statement-breakpoint
CREATE INDEX "contact_message_entry_id_created_at_index" ON "contact_message" USING btree ("entry_id","created_at");--> statement-breakpoint
CREATE INDEX "contact_message_created_at_index" ON "contact_message" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "hr_street_search_trgm_idx" ON "hr_street" USING gin ("search_text" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "job_status_run_at_priority_index" ON "job" USING btree ("status","run_at","priority");--> statement-breakpoint
CREATE UNIQUE INDEX "link_live_unique" ON "link" USING btree ("from_id","to_id","kind") WHERE "link"."status" in ('proposed', 'confirmed');--> statement-breakpoint
CREATE INDEX "link_proposed_by_index" ON "link" USING btree ("proposed_by");--> statement-breakpoint
CREATE INDEX "link_proposed_by_entry_id_index" ON "link" USING btree ("proposed_by_entry_id");--> statement-breakpoint
CREATE INDEX "link_decided_by_index" ON "link" USING btree ("decided_by");--> statement-breakpoint
CREATE INDEX "link_from_id_index" ON "link" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "link_to_id_index" ON "link" USING btree ("to_id");--> statement-breakpoint
CREATE INDEX "link_evidence_link_id_index" ON "link_evidence" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "change_log_entity_created_idx" ON "change_log" USING btree ("entity_type","entity_id","created_at" desc);--> statement-breakpoint
CREATE INDEX "change_log_user_id_index" ON "change_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "review_item_status_type_created_at_index" ON "review_item" USING btree ("status","type","created_at");--> statement-breakpoint
CREATE INDEX "review_item_entity_type_entity_id_index" ON "review_item" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "review_item_decided_by_index" ON "review_item" USING btree ("decided_by");--> statement-breakpoint
CREATE INDEX "opportunity_status_expires_at_index" ON "opportunity" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "opportunity_entry_id_index" ON "opportunity" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "opportunity_tag_tag_id_index" ON "opportunity_tag" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "entry_tag_tag_id_field_index" ON "entry_tag" USING btree ("tag_id","field");--> statement-breakpoint
CREATE UNIQUE INDEX "tag_slug_lower_idx" ON "tag" USING btree (lower("slug"));--> statement-breakpoint
CREATE INDEX "tag_parent_id_index" ON "tag" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "tag_canonical_id_index" ON "tag" USING btree ("canonical_id");--> statement-breakpoint
CREATE INDEX "tag_suggested_by_index" ON "tag" USING btree ("suggested_by");