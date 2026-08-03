-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('INITIAL', 'RESTOCK', 'ADJUSTMENT', 'SALE', 'RETURN', 'RESERVATION', 'RELEASE');

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(140) NOT NULL,
    "description" TEXT,
    "parent_id" UUID,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "categories_position_check" CHECK ("position" >= 0)
);

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(140) NOT NULL,
    "description" TEXT,
    "website_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "price_piasters" INTEGER NOT NULL,
    "sale_price_piasters" INTEGER,
    "sort_price_piasters" INTEGER NOT NULL,
    "category_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_new_arrival" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "products_price_check" CHECK ("price_piasters" > 0),
    CONSTRAINT "products_sale_price_check" CHECK ("sale_price_piasters" IS NULL OR ("sale_price_piasters" > 0 AND "sale_price_piasters" < "price_piasters")),
    CONSTRAINT "products_sort_price_check" CHECK ("sort_price_piasters" = COALESCE("sale_price_piasters", "price_piasters"))
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "sku" VARCHAR(80) NOT NULL,
    "size" VARCHAR(40) NOT NULL,
    "color_name" VARCHAR(80) NOT NULL,
    "color_hex" CHAR(7),
    "combination_key" VARCHAR(160) NOT NULL,
    "price_override_piasters" INTEGER,
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 5,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_variants_price_check" CHECK ("price_override_piasters" IS NULL OR "price_override_piasters" > 0),
    CONSTRAINT "product_variants_stock_check" CHECK ("stock_quantity" >= 0),
    CONSTRAINT "product_variants_low_stock_check" CHECK ("low_stock_threshold" >= 0),
    CONSTRAINT "product_variants_position_check" CHECK ("position" >= 0),
    CONSTRAINT "product_variants_color_hex_check" CHECK ("color_hex" IS NULL OR "color_hex" ~ '^#[0-9A-Fa-f]{6}$')
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "public_id" VARCHAR(255) NOT NULL,
    "secure_url" VARCHAR(1000) NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "format" VARCHAR(20) NOT NULL,
    "bytes" INTEGER NOT NULL,
    "alt_text" VARCHAR(180) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_images_dimensions_check" CHECK ("width" > 0 AND "height" > 0),
    CONSTRAINT "product_images_bytes_check" CHECK ("bytes" > 0),
    CONSTRAINT "product_images_position_check" CHECK ("position" >= 0),
    CONSTRAINT "product_images_secure_url_check" CHECK ("secure_url" LIKE 'https://%')
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "actor_id" UUID,
    "type" "InventoryMovementType" NOT NULL,
    "quantity_delta" INTEGER NOT NULL,
    "quantity_after" INTEGER NOT NULL,
    "reason" VARCHAR(500),
    "reference_type" VARCHAR(80),
    "reference_id" VARCHAR(100),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "inventory_movements_delta_check" CHECK ("quantity_delta" <> 0),
    CONSTRAINT "inventory_movements_quantity_check" CHECK ("quantity_after" >= 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
CREATE INDEX "categories_parent_id_position_idx" ON "categories"("parent_id", "position");
CREATE INDEX "categories_is_active_position_idx" ON "categories"("is_active", "position");
CREATE INDEX "categories_deleted_at_idx" ON "categories"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");
CREATE INDEX "brands_is_active_name_idx" ON "brands"("is_active", "name");
CREATE INDEX "brands_deleted_at_idx" ON "brands"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");
CREATE INDEX "products_category_id_status_created_at_idx" ON "products"("category_id", "status", "created_at");
CREATE INDEX "products_brand_id_status_created_at_idx" ON "products"("brand_id", "status", "created_at");
CREATE INDEX "products_status_is_featured_created_at_idx" ON "products"("status", "is_featured", "created_at");
CREATE INDEX "products_status_is_new_arrival_created_at_idx" ON "products"("status", "is_new_arrival", "created_at");
CREATE INDEX "products_status_sort_price_piasters_idx" ON "products"("status", "sort_price_piasters");
CREATE INDEX "products_deleted_at_idx" ON "products"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");
CREATE UNIQUE INDEX "product_variants_product_id_combination_key_key" ON "product_variants"("product_id", "combination_key");
CREATE INDEX "product_variants_product_id_is_active_position_idx" ON "product_variants"("product_id", "is_active", "position");
CREATE INDEX "product_variants_stock_quantity_low_stock_threshold_idx" ON "product_variants"("stock_quantity", "low_stock_threshold");
CREATE INDEX "product_variants_deleted_at_idx" ON "product_variants"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "product_images_public_id_key" ON "product_images"("public_id");
CREATE INDEX "product_images_product_id_position_idx" ON "product_images"("product_id", "position");

-- CreateIndex
CREATE INDEX "inventory_movements_variant_id_created_at_idx" ON "inventory_movements"("variant_id", "created_at");
CREATE INDEX "inventory_movements_actor_id_created_at_idx" ON "inventory_movements"("actor_id", "created_at");
CREATE INDEX "inventory_movements_type_created_at_idx" ON "inventory_movements"("type", "created_at");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
