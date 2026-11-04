ALTER TABLE "payments"
ADD COLUMN "proof_image_public_id" VARCHAR(255),
ADD COLUMN "proof_submitted_at" TIMESTAMPTZ(3);
