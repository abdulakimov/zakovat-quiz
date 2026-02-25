-- AlterTable
ALTER TABLE "TeamInvite" ALTER COLUMN "expiresAt" SET DEFAULT (CURRENT_TIMESTAMP + interval '7 days');
