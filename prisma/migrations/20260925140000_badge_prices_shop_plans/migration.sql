ALTER TABLE "BadgeSettings" ADD COLUMN "supplierPriceCfa" INTEGER NOT NULL DEFAULT 8000;

CREATE TABLE "ShopPlan" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "priceCfa" INTEGER NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "maxProducts" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShopPlan_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Shop" ADD COLUMN "planId" INTEGER;
ALTER TABLE "Shop" ADD COLUMN "planEndsAt" TIMESTAMP(3);

ALTER TABLE "Shop" ADD CONSTRAINT "Shop_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ShopPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "ShopPlan" ("name", "priceCfa", "durationDays", "maxProducts", "active", "sortOrder", "updatedAt")
VALUES
  ('Essentiel', 5000, 90, 20, true, 1, CURRENT_TIMESTAMP),
  ('Commerce', 15000, 365, 100, true, 2, CURRENT_TIMESTAMP),
  ('Prestige', 30000, 365, 500, true, 3, CURRENT_TIMESTAMP);
