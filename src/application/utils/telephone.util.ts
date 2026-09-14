export function formatFullTelephone(
  indicatif: string,
  telephone: string,
): string {
  return `${indicatif}${telephone}`;
}

export function hasPhoneCredentials(
  telephone?: string,
  indicatif?: string,
): boolean {
  return Boolean(telephone?.trim() && indicatif?.trim());
}

/** Normalise un numéro Google People (canonicalForm ou value) en E.164. */
export function normalizeE164Phone(raw?: string): string | undefined {
  if (!raw?.trim()) {
    return undefined;
  }

  const cleaned = raw.replace(/[^\d+]/g, '');
  if (!cleaned) {
    return undefined;
  }

  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

export function resolveStoredTelephone(
  telephone?: string,
  indicatif?: string,
): string | undefined {
  if (!telephone?.trim()) {
    return undefined;
  }

  if (telephone.trim().startsWith('+')) {
    return normalizeE164Phone(telephone);
  }

  if (indicatif?.trim()) {
    return formatFullTelephone(indicatif, telephone);
  }

  return undefined;
}
