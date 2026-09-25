-- Premier super administrateur : numéro 777065468 (avec ou sans indicatif).
-- Les autres comptes ADMIN restent administrateurs.
UPDATE "User"
SET "role" = 'SUPER_ADMIN'
WHERE regexp_replace(coalesce("phoneNumber", ''), '[^0-9]', '', 'g') LIKE '%777065468';
