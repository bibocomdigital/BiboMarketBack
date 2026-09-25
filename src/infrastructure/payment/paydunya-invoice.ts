import {
  DNS,
  FRONTEND_URL,
  LOGO_URL,
  NAME,
  PAYDUNYA_CALL_BACK,
  PAYDUNYA_CANCEL_URL,
  PAYDUNYA_MASTER_KEY,
  PAYDUNYA_MODE,
  PAYDUNYA_PRIVATE_KEY,
  PAYDUNYA_PUBLIC_KEY,
  PAYDUNYA_RETURN_URL,
  PAYDUNYA_TOKEN,
  PHONE_NUMBER,
  POSTAL_ADDRESS,
  TAGLINE,
} from '@application/config/env';

export function paydunyaConfigured(): boolean {
  return Boolean(
    PAYDUNYA_MASTER_KEY && PAYDUNYA_PRIVATE_KEY && PAYDUNYA_TOKEN,
  );
}

function sandbox(): boolean {
  return (PAYDUNYA_MODE || 'test').toLowerCase() !== 'live';
}

function apiBase(): string {
  return sandbox()
    ? 'https://app.paydunya.com/sandbox-api/v1'
    : 'https://app.paydunya.com/api/v1';
}

export function paydunyaCheckoutUrl(token: string): string {
  const root = sandbox()
    ? 'https://app.paydunya.com/sandbox-checkout/invoice/checkout/'
    : 'https://app.paydunya.com/checkout/invoice/checkout/';
  return `${root}${token}`;
}

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'PAYDUNYA-MASTER-KEY': PAYDUNYA_MASTER_KEY || '',
    'PAYDUNYA-PRIVATE-KEY': PAYDUNYA_PRIVATE_KEY || '',
    'PAYDUNYA-TOKEN': PAYDUNYA_TOKEN || '',
    ...(PAYDUNYA_PUBLIC_KEY
      ? { 'PAYDUNYA-PUBLIC-KEY': PAYDUNYA_PUBLIC_KEY }
      : {}),
  };
}

export async function createPaydunyaInvoice(input: {
  amount: number;
  description: string;
  subscriptionId: number;
}): Promise<{ token: string; checkoutUrl: string }> {
  const returnUrl =
    PAYDUNYA_RETURN_URL ||
    `${(FRONTEND_URL || 'http://localhost:3006').replace(/\/$/, '')}/merchant-dashboard?view=badge`;
  const cancelUrl = PAYDUNYA_CANCEL_URL || returnUrl;
  const callbackUrl =
    PAYDUNYA_CALL_BACK ||
    (DNS ? `${DNS.replace(/\/$/, '')}/api/badges/ipn` : returnUrl);

  const response = await fetch(`${apiBase()}/checkout-invoice/create`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      invoice: {
        total_amount: input.amount,
        description: input.description,
      },
      store: {
        name: NAME || 'Bibocom Market',
        tagline: TAGLINE || 'Badge annuel',
        phone: PHONE_NUMBER || '000000000',
        postal_address: POSTAL_ADDRESS || 'Dakar',
        website_url: FRONTEND_URL || 'http://localhost:3006',
        logo_url: LOGO_URL || '',
      },
      custom_data: {
        subscription_id: String(input.subscriptionId),
      },
      actions: {
        cancel_url: cancelUrl,
        return_url: returnUrl,
        callback_url: callbackUrl,
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    response_code?: string;
    response_text?: string;
    token?: string;
  } | null;

  if (!response.ok || payload?.response_code !== '00' || !payload.token) {
    const detail = payload?.response_text || `HTTP ${response.status}`;
    throw new Error(detail);
  }

  return {
    token: payload.token,
    checkoutUrl: paydunyaCheckoutUrl(payload.token),
  };
}

export async function confirmPaydunyaInvoice(token: string): Promise<{
  paid: boolean;
  status: string;
}> {
  const response = await fetch(
    `${apiBase()}/checkout-invoice/confirm/${encodeURIComponent(token)}`,
    { headers: headers() },
  );
  const payload = (await response.json().catch(() => null)) as {
    response_code?: string;
    status?: string;
    invoice?: { status?: string };
  } | null;

  const status = String(
    payload?.status || payload?.invoice?.status || '',
  ).toLowerCase();
  const paid = payload?.response_code === '00' && status === 'completed';
  return { paid, status: status || 'unknown' };
}
