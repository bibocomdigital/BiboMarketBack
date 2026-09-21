import {
  ORANGE_AUTH_HEADER,
  ORANGE_CLIENT_ID,
  ORANGE_CLIENT_SECRET,
  ORANGE_TOKEN_URL,
} from '@application/config/env';
import { ErrorCode } from '@domain/enums/error-code.enum';
import { AppException } from '@domain/exceptions/app.exception';

interface OrangeTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

export class OrangeAuthService {
  private cachedToken: CachedToken | null = null;

  async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.accessToken;
    }

    const authorizationHeader = this.buildAuthorizationHeader();

    const response = await fetch(
      ORANGE_TOKEN_URL ?? 'https://api.orange.com/oauth/v3/token',
      {
        method: 'POST',
        headers: {
          Authorization: authorizationHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: 'grant_type=client_credentials',
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Orange OAuth error:', errorBody);
      throw AppException.create(
        ErrorCode.EXTERNAL_SERVICE_ERROR,
        "Impossible d'obtenir le token Orange",
      );
    }

    const data = (await response.json()) as OrangeTokenResponse;
    const safetyMarginMs = 60_000;

    this.cachedToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000 - safetyMarginMs,
    };

    return data.access_token;
  }

  private buildAuthorizationHeader(): string {
    if (ORANGE_AUTH_HEADER) {
      return ORANGE_AUTH_HEADER.startsWith('Basic ')
        ? ORANGE_AUTH_HEADER
        : `Basic ${ORANGE_AUTH_HEADER}`;
    }

    if (!ORANGE_CLIENT_ID || !ORANGE_CLIENT_SECRET) {
      throw AppException.create(
        ErrorCode.CONFIGURATION_ERROR,
        'ORANGE_CLIENT_ID et ORANGE_CLIENT_SECRET (ou ORANGE_AUTH_HEADER) sont requis',
      );
    }

    const credentials = Buffer.from(
      `${ORANGE_CLIENT_ID}:${ORANGE_CLIENT_SECRET}`,
    ).toString('base64');

    return `Basic ${credentials}`;
  }
}
