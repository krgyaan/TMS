CREATE TABLE IF NOT EXISTS "inventory_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"item_name" varchar(120) NOT NULL,
	"item_type" varchar(80),
	"specifications" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"unit" varchar(80) NOT NULL,
	"conversion" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"hsn_code" varchar(30),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
