UPDATE "Pack"
SET "breakTimerSec" = COALESCE("breakTimerSec", "defaultWriteAnswerTimerSec")
WHERE "defaultWriteAnswerTimerSec" IS NOT NULL;

ALTER TABLE "Pack"
DROP COLUMN "defaultWriteAnswerTimerSec";
