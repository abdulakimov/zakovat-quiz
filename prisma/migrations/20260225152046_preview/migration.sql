DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'AnswerItem'
  ) THEN
    ALTER TABLE "AnswerItem" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;

-- AlterTable
ALTER TABLE "TeamInvite" ALTER COLUMN "expiresAt" SET DEFAULT (CURRENT_TIMESTAMP + interval '7 days');
