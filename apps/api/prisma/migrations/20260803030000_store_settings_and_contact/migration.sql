CREATE TYPE "ContactMessageStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM');

CREATE TABLE "website_settings" (
    "id" VARCHAR(30) NOT NULL,
    "store_name" VARCHAR(120) NOT NULL,
    "tagline" VARCHAR(180) NOT NULL,
    "contact_email" VARCHAR(254) NOT NULL,
    "contact_phone" VARCHAR(20),
    "store_address" VARCHAR(500),
    "business_hours" VARCHAR(250) NOT NULL,
    "announcement_text" VARCHAR(180),
    "announcement_enabled" BOOLEAN NOT NULL DEFAULT false,
    "cash_on_delivery_enabled" BOOLEAN NOT NULL DEFAULT true,
    "instapay_enabled" BOOLEAN NOT NULL DEFAULT true,
    "instapay_id" VARCHAR(120) NOT NULL,
    "instapay_qr_value" VARCHAR(500),
    "instapay_instructions" VARCHAR(1000) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "website_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "social_links" (
    "id" UUID NOT NULL,
    "platform" VARCHAR(40) NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "social_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "homepage_banners" (
    "id" UUID NOT NULL,
    "eyebrow" VARCHAR(100),
    "title" VARCHAR(180) NOT NULL,
    "description" VARCHAR(500),
    "image_url" VARCHAR(2048) NOT NULL,
    "image_public_id" VARCHAR(255),
    "alt_text" VARCHAR(180) NOT NULL,
    "cta_label" VARCHAR(80) NOT NULL,
    "cta_url" VARCHAR(2048) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "starts_at" TIMESTAMPTZ(3),
    "ends_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "homepage_banners_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contact_messages" (
    "id" UUID NOT NULL,
    "status" "ContactMessageStatus" NOT NULL DEFAULT 'NEW',
    "name" VARCHAR(160) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(20),
    "order_number" VARCHAR(32),
    "subject" VARCHAR(160) NOT NULL,
    "message" VARCHAR(3000) NOT NULL,
    "admin_note" VARCHAR(1000),
    "resolved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "social_links_platform_key" ON "social_links"("platform");
CREATE INDEX "social_links_is_active_position_idx" ON "social_links"("is_active", "position");
CREATE INDEX "homepage_banners_is_active_position_idx" ON "homepage_banners"("is_active", "position");
CREATE INDEX "homepage_banners_starts_at_ends_at_idx" ON "homepage_banners"("starts_at", "ends_at");
CREATE INDEX "contact_messages_status_created_at_idx" ON "contact_messages"("status", "created_at");
CREATE INDEX "contact_messages_email_created_at_idx" ON "contact_messages"("email", "created_at");
