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
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"impersonated_by" uuid,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'member' NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"locale" text DEFAULT 'en' NOT NULL,
	"invited_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim_invite" (
	"id" uuid PRIMARY KEY NOT NULL,
	"entry_id" uuid NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"reminder_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "claim_invite_tokenHash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "entry" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"trusted" boolean DEFAULT true NOT NULL,
	"owner_user_id" uuid,
	"name" text NOT NULL,
	"source_locale" text NOT NULL,
	"description" jsonb,
	"description_text" text DEFAULT '' NOT NULL,
	"offering_text" text DEFAULT '' NOT NULL,
	"seeking_text" text DEFAULT '' NOT NULL,
	"website" text,
	"socials" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"contact_email_invalid" boolean DEFAULT false NOT NULL,
	"visibility" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"consent_at" timestamp with time zone,
	"consent_version" text,
	"extra" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"extra_schema_version" integer DEFAULT 1 NOT NULL,
	"logo_image_id" uuid,
	"cover_image_id" uuid,
	"matching_opt_out" boolean DEFAULT false NOT NULL,
	"last_confirmed_at" timestamp with time zone,
	"suspended_reason" text,
	"online_only" boolean DEFAULT false NOT NULL,
	"address_text" text,
	"lat" double precision,
	"lng" double precision,
	"city" text,
	"country_code" text,
	"precision" text,
	"location_source" text,
	"pin_moved_by_hand" boolean DEFAULT false NOT NULL,
	"geocoded_at" timestamp with time zone,
	"location_display" text DEFAULT 'exact' NOT NULL,
	"imported_at" timestamp with time zone,
	"erasure_requested_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entry_kind_check" CHECK ("entry"."kind" in ('organization', 'person', 'outside_partner')),
	CONSTRAINT "entry_status_check" CHECK ("entry"."status" in ('draft', 'pending', 'published', 'suspended', 'rejected', 'archived')),
	CONSTRAINT "entry_precision_check" CHECK ("entry"."precision" in ('house', 'street', 'town')),
	CONSTRAINT "entry_location_source_check" CHECK ("entry"."location_source" in ('geoapify', 'dgu', 'photon', 'nominatim', 'manual', 'town_list')),
	CONSTRAINT "entry_location_display_check" CHECK ("entry"."location_display" in ('exact', 'town'))
);
--> statement-breakpoint
CREATE TABLE "slug_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"entry_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "slug_history_slug_unique" UNIQUE("slug")
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
	"lat" real NOT NULL
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
CREATE TABLE "image" (
	"id" uuid PRIMARY KEY NOT NULL,
	"bytes" "bytea" NOT NULL,
	"mime" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"size" integer NOT NULL,
	"content_hash" text NOT NULL,
	"alt_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "image_contentHash_unique" UNIQUE("content_hash"),
	CONSTRAINT "image_size_check" CHECK ("image"."size" > 0 and "image"."size" <= 1000000)
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
	CONSTRAINT "job_idempotencyKey_unique" UNIQUE("idempotency_key"),
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
	CONSTRAINT "link_fromId_toId_kind_unique" UNIQUE("from_id","to_id","kind"),
	CONSTRAINT "link_not_self_check" CHECK ("link"."from_id" <> "link"."to_id"),
	CONSTRAINT "link_symmetric_order_check" CHECK (not "link"."symmetric" or "link"."from_id" < "link"."to_id"),
	CONSTRAINT "link_kind_check" CHECK ("link"."kind" in ('collaborated', 'eu_partner', 'member_of', 'supplier', 'mentor')),
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
	CONSTRAINT "tag_slug_unique" UNIQUE("slug"),
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
	CONSTRAINT "translation_entityType_entityId_field_locale_unique" UNIQUE("entity_type","entity_id","field","locale"),
	CONSTRAINT "translation_entity_check" CHECK ("translation"."entity_type" in ('entry', 'opportunity')),
	CONSTRAINT "translation_origin_check" CHECK ("translation"."origin" in ('machine', 'human'))
);
--> statement-breakpoint
ALTER TABLE "contact_message" ADD CONSTRAINT "contact_message_entry_id_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_view_day" ADD CONSTRAINT "entry_view_day_entry_id_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_invite" ADD CONSTRAINT "claim_invite_entry_id_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry" ADD CONSTRAINT "entry_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry" ADD CONSTRAINT "entry_logo_image_id_image_id_fk" FOREIGN KEY ("logo_image_id") REFERENCES "public"."image"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry" ADD CONSTRAINT "entry_cover_image_id_image_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."image"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slug_history" ADD CONSTRAINT "slug_history_entry_id_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_address" ADD CONSTRAINT "hr_address_street_id_hr_street_id_fk" FOREIGN KEY ("street_id") REFERENCES "public"."hr_street"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link" ADD CONSTRAINT "link_from_id_entry_id_fk" FOREIGN KEY ("from_id") REFERENCES "public"."entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link" ADD CONSTRAINT "link_to_id_entry_id_fk" FOREIGN KEY ("to_id") REFERENCES "public"."entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link" ADD CONSTRAINT "link_proposed_by_user_id_fk" FOREIGN KEY ("proposed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link" ADD CONSTRAINT "link_proposed_by_entry_id_entry_id_fk" FOREIGN KEY ("proposed_by_entry_id") REFERENCES "public"."entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link" ADD CONSTRAINT "link_decided_by_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_evidence" ADD CONSTRAINT "link_evidence_link_id_link_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."link"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_log" ADD CONSTRAINT "change_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
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
CREATE INDEX "account_user_id_index" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_index" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_index" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "claim_invite_entry_id_index" ON "claim_invite" USING btree ("entry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "entry_slug_lower_idx" ON "entry" USING btree (lower("slug"));--> statement-breakpoint
CREATE INDEX "entry_status_kind_index" ON "entry" USING btree ("status","kind");--> statement-breakpoint
CREATE INDEX "entry_owner_user_id_index" ON "entry" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "entry_published_idx" ON "entry" USING btree ("id") WHERE "entry"."status" = 'published';--> statement-breakpoint
CREATE INDEX "hr_address_street_id_house_number_index" ON "hr_address" USING btree ("street_id","house_number");--> statement-breakpoint
CREATE INDEX "hr_street_search_trgm_idx" ON "hr_street" USING gin ("search_text" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "job_status_run_at_priority_index" ON "job" USING btree ("status","run_at","priority");--> statement-breakpoint
CREATE INDEX "link_from_id_index" ON "link" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "link_to_id_index" ON "link" USING btree ("to_id");--> statement-breakpoint
CREATE INDEX "link_evidence_link_id_index" ON "link_evidence" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "change_log_entity_created_idx" ON "change_log" USING btree ("entity_type","entity_id","created_at" desc);--> statement-breakpoint
CREATE INDEX "review_item_status_type_created_at_index" ON "review_item" USING btree ("status","type","created_at");--> statement-breakpoint
CREATE INDEX "review_item_entity_type_entity_id_index" ON "review_item" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "opportunity_status_expires_at_index" ON "opportunity" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "opportunity_entry_id_index" ON "opportunity" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "opportunity_tag_tag_id_index" ON "opportunity_tag" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "entry_tag_tag_id_field_index" ON "entry_tag" USING btree ("tag_id","field");