ALTER TABLE "orders"
  ADD COLUMN "guest_token_hash" CHAR(64),
  ALTER COLUMN "user_id" DROP NOT NULL;

ALTER TABLE "coupon_redemptions"
  ADD COLUMN "guest_token_hash" CHAR(64),
  ALTER COLUMN "user_id" DROP NOT NULL;

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_owner_check"
  CHECK (
    ("user_id" IS NOT NULL AND "guest_token_hash" IS NULL) OR
    ("user_id" IS NULL AND "guest_token_hash" IS NOT NULL)
  );

ALTER TABLE "coupon_redemptions"
  ADD CONSTRAINT "coupon_redemptions_owner_check"
  CHECK (
    ("user_id" IS NOT NULL AND "guest_token_hash" IS NULL) OR
    ("user_id" IS NULL AND "guest_token_hash" IS NOT NULL)
  );

CREATE UNIQUE INDEX "orders_guest_token_hash_idempotency_key_key"
  ON "orders"("guest_token_hash", "idempotency_key");
CREATE INDEX "orders_guest_token_hash_created_at_idx"
  ON "orders"("guest_token_hash", "created_at");
CREATE INDEX "coupon_redemptions_coupon_id_guest_token_hash_created_at_idx"
  ON "coupon_redemptions"("coupon_id", "guest_token_hash", "created_at");
