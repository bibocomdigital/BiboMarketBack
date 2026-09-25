export enum Role {
  CLIENT = 'CLIENT',
  MERCHANT = 'MERCHANT',
  SUPPLIER = 'SUPPLIER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  MODERATOR = 'MODERATOR',
}

export function isSuperAdminRole(role?: string | null): boolean {
  return role === Role.SUPER_ADMIN;
}

/** Super administrateur et administrateur : finance, commandes, utilisateurs. */
export function isOperatorRole(role?: string | null): boolean {
  return role === Role.ADMIN || role === Role.SUPER_ADMIN;
}

/** Équipe interne, y compris le modérateur. */
export function isStaffRole(role?: string | null): boolean {
  return isOperatorRole(role) || role === Role.MODERATOR;
}

const SUPER_ADMIN_PHONE_DIGITS = '777065468';

/** Le compte porteur de ce numéro est le super administrateur. */
export function isDesignatedSuperAdminPhone(phone?: string | null): boolean {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.endsWith(SUPER_ADMIN_PHONE_DIGITS);
}

/** Formes équivalentes d'un numéro, pour retrouver le même compte. */
export function phoneLookupValues(raw?: string | null): string[] {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (!digits) return [];
  const variants = new Set<string>([digits, `+${digits}`]);
  const local = digits.startsWith('221') && digits.length > 3 ? digits.slice(3) : digits;
  variants.add(local);
  variants.add(`+${local}`);
  variants.add(`221${local}`);
  variants.add(`+221${local}`);
  return [...variants];
}

export enum AuthProvider {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
  FACEBOOK = 'FACEBOOK',
}
