-- Rôles d'équipe, badge payant et stories.
ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';
ALTER TYPE "UserRole" ADD VALUE 'MODERATOR';

CREATE TYPE "BadgeStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'EXPIRED');
CREATE TYPE "StoryMediaType" AS ENUM ('PHOTO', 'VIDEO');
CREATE TYPE "StoryStatus" AS ENUM ('PUBLISHED', 'REJECTED');

CREATE TABLE "BadgeSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "priceCfa" INTEGER NOT NULL DEFAULT 12000,
    "durationDays" INTEGER NOT NULL DEFAULT 365,
    "graceDays" INTEGER NOT NULL DEFAULT 7,
    "saleOpen" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BadgeSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "BadgeSettings" ("id", "priceCfa", "durationDays", "graceDays", "saleOpen", "updatedAt")
VALUES (1, 12000, 365, 7, true, CURRENT_TIMESTAMP);

CREATE TABLE "BadgeSubscription" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "BadgeStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "priceCfa" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "graceEndsAt" TIMESTAMP(3),
    "paydunyaToken" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BadgeSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BadgeSubscription_paydunyaToken_key" ON "BadgeSubscription"("paydunyaToken");
CREATE INDEX "BadgeSubscription_userId_status_idx" ON "BadgeSubscription"("userId", "status");

ALTER TABLE "BadgeSubscription"
ADD CONSTRAINT "BadgeSubscription_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "BadgeReminder" (
    "id" SERIAL NOT NULL,
    "subscriptionId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BadgeReminder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BadgeReminder_subscriptionId_kind_key" ON "BadgeReminder"("subscriptionId", "kind");

ALTER TABLE "BadgeReminder"
ADD CONSTRAINT "BadgeReminder_subscriptionId_fkey"
FOREIGN KEY ("subscriptionId") REFERENCES "BadgeSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Story" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "mediaType" "StoryMediaType" NOT NULL,
    "mediaPath" TEXT NOT NULL,
    "durationSeconds" INTEGER,
    "status" "StoryStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Story_status_expiresAt_idx" ON "Story"("status", "expiresAt");

ALTER TABLE "Story"
ADD CONSTRAINT "Story_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
