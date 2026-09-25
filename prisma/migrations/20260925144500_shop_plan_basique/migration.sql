INSERT INTO "ShopPlan" ("name", "priceCfa", "durationDays", "maxProducts", "active", "sortOrder", "updatedAt")
SELECT 'Basique', 0, 365, 10, true, 0, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "ShopPlan" WHERE "name" = 'Basique'
);
