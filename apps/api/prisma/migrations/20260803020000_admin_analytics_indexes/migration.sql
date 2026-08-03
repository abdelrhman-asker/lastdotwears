-- Dashboard analytics filter and recent-order queries use the order creation time.
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");
