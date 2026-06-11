CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TABLE "cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"scryfall_id" text NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"set_code" text,
	"collector_number" text,
	"image_uri" text,
	"mana_cost" text,
	"cmc" numeric,
	"type_line" text,
	"prices_usd" numeric,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cards_scryfall_id_unique" UNIQUE("scryfall_id")
);
--> statement-breakpoint
CREATE TABLE "collection_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"card_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"foil" boolean DEFAULT false NOT NULL,
	"condition" text,
	"source" text DEFAULT 'manabox' NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deck_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"deck_id" integer NOT NULL,
	"card_name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"is_commander" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"owner_user_id" integer NOT NULL,
	"source" text DEFAULT 'paste' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "users_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_cards" ADD CONSTRAINT "deck_cards_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cards_normalized_name_trgm" ON "cards" USING gin ("normalized_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "collection_items_user_idx" ON "collection_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "collection_items_card_idx" ON "collection_items" USING btree ("card_id");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_items_user_card_foil_uniq" ON "collection_items" USING btree ("user_id","card_id","foil");--> statement-breakpoint
CREATE INDEX "deck_cards_deck_idx" ON "deck_cards" USING btree ("deck_id");