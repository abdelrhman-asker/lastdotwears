-- CreateEnum
CREATE TYPE "CouponDiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH_ON_DELIVERY', 'INSTAPAY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'WAITING_FOR_PAYMENT', 'PAID', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'WAITING_FOR_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateTable
CREATE TABLE "coupons" (
    "id" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "description" VARCHAR(500),
    "discount_type" "CouponDiscountType" NOT NULL,
    "value" INTEGER NOT NULL,
    "minimum_subtotal_piasters" INTEGER NOT NULL DEFAULT 0,
    "maximum_discount_piasters" INTEGER,
    "starts_at" TIMESTAMPTZ(3),
    "ends_at" TIMESTAMPTZ(3),
    "usage_limit" INTEGER,
    "per_customer_limit" INTEGER NOT NULL DEFAULT 1,
    "times_used" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "coupons_code_format_check" CHECK ("code" = UPPER("code") AND LENGTH(BTRIM("code")) > 0),
    CONSTRAINT "coupons_value_check" CHECK (
      ("discount_type" = 'PERCENTAGE' AND "value" BETWEEN 1 AND 100)
      OR ("discount_type" = 'FIXED_AMOUNT' AND "value" > 0)
    ),
    CONSTRAINT "coupons_limits_check" CHECK (
      "minimum_subtotal_piasters" >= 0
      AND ("maximum_discount_piasters" IS NULL OR "maximum_discount_piasters" > 0)
      AND ("usage_limit" IS NULL OR "usage_limit" > 0)
      AND "per_customer_limit" > 0
      AND "times_used" >= 0
      AND ("usage_limit" IS NULL OR "times_used" <= "usage_limit")
    ),
    CONSTRAINT "coupons_dates_check" CHECK ("starts_at" IS NULL OR "ends_at" IS NULL OR "starts_at" < "ends_at")
);

-- CreateTable
CREATE TABLE "shipping_rates" (
    "id" UUID NOT NULL,
    "governorate_code" VARCHAR(40) NOT NULL,
    "governorate_name" VARCHAR(100) NOT NULL,
    "fee_piasters" INTEGER NOT NULL,
    "estimated_min_days" INTEGER NOT NULL,
    "estimated_max_days" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shipping_rates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "shipping_rates_values_check" CHECK (
      "fee_piasters" >= 0
      AND "estimated_min_days" > 0
      AND "estimated_max_days" >= "estimated_min_days"
    )
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "order_number" VARCHAR(32) NOT NULL,
    "invoice_number" VARCHAR(32) NOT NULL,
    "idempotency_key" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "coupon_id" UUID,
    "shipping_rate_id" UUID,
    "status" "OrderStatus" NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "payment_status" "PaymentStatus" NOT NULL,
    "customer_first_name" VARCHAR(80) NOT NULL,
    "customer_last_name" VARCHAR(80) NOT NULL,
    "customer_email" VARCHAR(254) NOT NULL,
    "customer_phone" VARCHAR(20) NOT NULL,
    "shipping_governorate_code" VARCHAR(40) NOT NULL,
    "shipping_governorate_name" VARCHAR(100) NOT NULL,
    "shipping_city" VARCHAR(120) NOT NULL,
    "shipping_address_line_1" VARCHAR(250) NOT NULL,
    "shipping_address_line_2" VARCHAR(250),
    "shipping_postal_code" VARCHAR(20),
    "delivery_notes" VARCHAR(1000),
    "coupon_code" VARCHAR(40),
    "subtotal_piasters" INTEGER NOT NULL,
    "discount_piasters" INTEGER NOT NULL DEFAULT 0,
    "shipping_piasters" INTEGER NOT NULL,
    "total_piasters" INTEGER NOT NULL,
    "placed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "orders_amounts_check" CHECK (
      "subtotal_piasters" >= 0
      AND "discount_piasters" >= 0
      AND "discount_piasters" <= "subtotal_piasters"
      AND "shipping_piasters" >= 0
      AND "total_piasters" = "subtotal_piasters" - "discount_piasters" + "shipping_piasters"
    )
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID,
    "variant_id" UUID,
    "product_name" VARCHAR(180) NOT NULL,
    "product_slug" VARCHAR(200) NOT NULL,
    "sku" VARCHAR(80) NOT NULL,
    "size" VARCHAR(40) NOT NULL,
    "color_name" VARCHAR(80) NOT NULL,
    "color_hex" CHAR(7),
    "image_url" VARCHAR(1000),
    "unit_price_piasters" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "line_total_piasters" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "order_items_amounts_check" CHECK (
      "unit_price_piasters" >= 0
      AND "quantity" BETWEEN 1 AND 99
      AND "line_total_piasters" = "unit_price_piasters" * "quantity"
    )
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "amount_piasters" INTEGER NOT NULL,
    "instapay_reference" VARCHAR(120),
    "confirmation_note" VARCHAR(500),
    "confirmed_by_id" UUID,
    "confirmed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payments_amount_check" CHECK ("amount_piasters" >= 0)
);

-- CreateTable
CREATE TABLE "order_status_events" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "actor_id" UUID,
    "from_status" "OrderStatus",
    "to_status" "OrderStatus" NOT NULL,
    "note" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_redemptions" (
    "id" UUID NOT NULL,
    "coupon_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "discount_piasters" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "coupon_redemptions_discount_check" CHECK ("discount_piasters" > 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_is_active_starts_at_ends_at_idx" ON "coupons"("is_active", "starts_at", "ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_rates_governorate_code_key" ON "shipping_rates"("governorate_code");

-- CreateIndex
CREATE INDEX "shipping_rates_is_active_governorate_name_idx" ON "shipping_rates"("is_active", "governorate_name");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "orders_invoice_number_key" ON "orders"("invoice_number");

-- CreateIndex
CREATE INDEX "orders_user_id_created_at_idx" ON "orders"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at");

-- CreateIndex
CREATE INDEX "orders_payment_status_created_at_idx" ON "orders"("payment_status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_user_id_idempotency_key_key" ON "orders"("user_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX "order_items_variant_id_idx" ON "order_items"("variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_order_id_key" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");

-- CreateIndex
CREATE INDEX "order_status_events_order_id_created_at_idx" ON "order_status_events"("order_id", "created_at");

-- CreateIndex
CREATE INDEX "order_status_events_actor_id_created_at_idx" ON "order_status_events"("actor_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_redemptions_order_id_key" ON "coupon_redemptions"("order_id");

-- CreateIndex
CREATE INDEX "coupon_redemptions_coupon_id_user_id_created_at_idx" ON "coupon_redemptions"("coupon_id", "user_id", "created_at");

-- CreateIndex
CREATE INDEX "coupon_redemptions_user_id_created_at_idx" ON "coupon_redemptions"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_rate_id_fkey" FOREIGN KEY ("shipping_rate_id") REFERENCES "shipping_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_confirmed_by_id_fkey" FOREIGN KEY ("confirmed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
