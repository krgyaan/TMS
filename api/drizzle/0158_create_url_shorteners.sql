-- Shortened public notification links (WhatsApp/email "Details:" line).
-- Each row maps a random 12-char token to a full URL; the web app at
-- /n/<token> resolves it via GET /api/v1/url-shortener/<token> and redirects.

CREATE TABLE IF NOT EXISTS "url_shorteners" (
    "id" bigserial NOT NULL PRIMARY KEY,
    "token" varchar(12) NOT NULL UNIQUE,
    "url" text NOT NULL,
    "purpose" varchar(50),
    "expires_at" timestamp with time zone,
    "visit_count" integer NOT NULL DEFAULT 0,
    "created_by" integer,
    "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
