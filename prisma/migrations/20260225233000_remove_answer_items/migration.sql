DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'AnswerItem'
  ) THEN
    DROP TABLE "AnswerItem";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'AnswerItemKind'
  ) THEN
    DROP TYPE "AnswerItemKind";
  END IF;
END $$;
