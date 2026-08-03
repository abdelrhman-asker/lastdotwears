-- CreateTable
CREATE TABLE "addresses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "recipient_first_name" VARCHAR(80) NOT NULL,
    "recipient_last_name" VARCHAR(80) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "governorate_code" VARCHAR(40) NOT NULL,
    "governorate_name" VARCHAR(100) NOT NULL,
    "city" VARCHAR(120) NOT NULL,
    "address_line_1" VARCHAR(250) NOT NULL,
    "address_line_2" VARCHAR(250),
    "postal_code" VARCHAR(20),
    "delivery_notes" VARCHAR(1000),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "addresses_label_check" CHECK (char_length(btrim("label")) >= 1),
    CONSTRAINT "addresses_recipient_first_name_check" CHECK (char_length(btrim("recipient_first_name")) >= 1),
    CONSTRAINT "addresses_recipient_last_name_check" CHECK (char_length(btrim("recipient_last_name")) >= 1),
    CONSTRAINT "addresses_phone_check" CHECK (char_length(btrim("phone")) >= 10),
    CONSTRAINT "addresses_governorate_code_check" CHECK ("governorate_code" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT "addresses_city_check" CHECK (char_length(btrim("city")) >= 2),
    CONSTRAINT "addresses_line_1_check" CHECK (char_length(btrim("address_line_1")) >= 5),
    CONSTRAINT "addresses_line_2_check" CHECK ("address_line_2" IS NULL OR char_length(btrim("address_line_2")) >= 1),
    CONSTRAINT "addresses_postal_code_check" CHECK ("postal_code" IS NULL OR "postal_code" ~ '^[A-Za-z0-9 -]{2,20}$'),
    CONSTRAINT "addresses_delivery_notes_check" CHECK ("delivery_notes" IS NULL OR char_length(btrim("delivery_notes")) >= 1)
);

-- A customer can have at most one default address. The repository promotes a
-- replacement inside the same transaction whenever the default is deleted.
CREATE UNIQUE INDEX "addresses_one_default_per_user_idx"
ON "addresses"("user_id")
WHERE "is_default" = true;

-- CreateIndex
CREATE INDEX "addresses_user_id_is_default_idx" ON "addresses"("user_id", "is_default");

-- CreateIndex
CREATE INDEX "addresses_user_id_updated_at_idx" ON "addresses"("user_id", "updated_at");

-- AddForeignKey
ALTER TABLE "addresses"
ADD CONSTRAINT "addresses_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
