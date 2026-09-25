/** Prix facturé : le prix promo s’il est renseigné et inférieur au prix. */
export function chargedPrice(price: number, promoPrice?: number | null): number {
  const regular = Number(price);
  const promo = promoPrice == null ? Number.NaN : Number(promoPrice);
  if (Number.isFinite(promo) && promo > 0 && promo < regular) return promo;
  return regular;
}
