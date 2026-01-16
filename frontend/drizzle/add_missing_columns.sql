-- Add missing columns to existing students table
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "face_id" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "fingerprint_id" text;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "invitation_sent" boolean DEFAULT false;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT false;
