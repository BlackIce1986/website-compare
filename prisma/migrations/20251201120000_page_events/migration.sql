-- Add JSONB column for pre-screenshot events per page
ALTER TABLE "Page" ADD COLUMN IF NOT EXISTS "preScreenshotEvents" JSONB;

