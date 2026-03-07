-- CreateEnum
CREATE TYPE "AvatarSource" AS ENUM ('PROVIDER', 'CUSTOM');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "imageUrl" TEXT,
ADD COLUMN "avatarSource" "AvatarSource" NOT NULL DEFAULT 'PROVIDER';

-- Backfill existing uploaded avatars as CUSTOM source.
UPDATE "User"
SET "avatarSource" = 'CUSTOM'
WHERE "avatarAssetId" IS NOT NULL;