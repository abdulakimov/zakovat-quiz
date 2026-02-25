CREATE TYPE "AnswerItemKind" AS ENUM ('TEXT', 'MEDIA');

ALTER TABLE "Pack"
ADD COLUMN "defaultQuestionTimerPresetSec" INTEGER;

CREATE TABLE "AnswerItem" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "kind" "AnswerItemKind" NOT NULL,
    "text" TEXT,
    "assetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnswerItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AnswerItem_questionId_order_key" ON "AnswerItem"("questionId", "order");
CREATE INDEX "AnswerItem_questionId_idx" ON "AnswerItem"("questionId");
CREATE INDEX "AnswerItem_assetId_idx" ON "AnswerItem"("assetId");
CREATE INDEX "Pack_defaultQuestionTimerPresetSec_idx" ON "Pack"("defaultQuestionTimerPresetSec");

ALTER TABLE "AnswerItem"
ADD CONSTRAINT "AnswerItem_questionId_fkey"
FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnswerItem"
ADD CONSTRAINT "AnswerItem_assetId_fkey"
FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "AnswerItem" ("id", "questionId", "order", "kind", "text")
SELECT
  'ai_txt_' || substring(md5(q.id || ':txt') for 24),
  q.id,
  1,
  'TEXT'::"AnswerItemKind",
  q."answerText"
FROM "Question" q
WHERE q."answerText" IS NOT NULL AND btrim(q."answerText") <> '';

INSERT INTO "AnswerItem" ("id", "questionId", "order", "kind", "assetId")
SELECT
  'ai_med_' || substring(md5(qm."questionId" || ':' || qm."assetId") for 24),
  qm."questionId",
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM "AnswerItem" ai
      WHERE ai."questionId" = qm."questionId"
    ) THEN 2
    ELSE 1
  END,
  'MEDIA'::"AnswerItemKind",
  qm."assetId"
FROM "QuestionMedia" qm
WHERE qm."role" = 'ANSWER_PRIMARY';
