CREATE TYPE "QrLoginStatus" AS ENUM ('PENDING', 'APPROVED', 'CONSUMED', 'EXPIRED');

CREATE TABLE "QrLoginSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "QrLoginStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "approvedUserId" TEXT,
    "userAgent" TEXT,
    "ip" TEXT,

    CONSTRAINT "QrLoginSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QrLoginSession_tokenHash_key" ON "QrLoginSession"("tokenHash");
CREATE INDEX "QrLoginSession_expiresAt_idx" ON "QrLoginSession"("expiresAt");
CREATE INDEX "QrLoginSession_status_idx" ON "QrLoginSession"("status");
CREATE INDEX "QrLoginSession_status_expiresAt_idx" ON "QrLoginSession"("status", "expiresAt");

ALTER TABLE "QrLoginSession"
ADD CONSTRAINT "QrLoginSession_approvedUserId_fkey"
FOREIGN KEY ("approvedUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
