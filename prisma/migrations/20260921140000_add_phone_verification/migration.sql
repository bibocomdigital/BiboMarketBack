-- AlterTable
ALTER TABLE "User" ADD COLUMN "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "phoneVerificationCode" TEXT,
ADD COLUMN "phoneVerificationExpiry" TIMESTAMP(3);