ALTER TABLE "product_images"
DROP CONSTRAINT "product_images_secure_url_check";

ALTER TABLE "product_images"
ADD CONSTRAINT "product_images_secure_url_check"
CHECK (
  "secure_url" LIKE 'https://%'
  OR "secure_url" LIKE '/api/v1/uploads/%'
);
