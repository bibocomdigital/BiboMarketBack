/**
 * Les seeders métier restent dans BiboMarketBackEnd
 * (seedCategories.js, seedMerchants.js, seedShops.js, etc.).
 *
 * Ce fichier ne doit rien écrire ni supprimer : la base marketplace
 * existante ne doit pas être altérée pendant la migration.
 */
async function main() {
  console.log(
    'Aucun seed n’est exécuté ici. Utilisez les scripts du projet Express existant.',
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
