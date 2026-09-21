import { Injectable } from '@nestjs/common';
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL as GOOGLE_CALLBACK_URL_ENV,
} from '@application/config/env';
import type {
  GoogleOAuthPort,
  GoogleProfile,
} from '@application/ports/output/google-oauth.port';

/** Callback Google : doit correspondre à l'URI enregistrée dans la console Google.
 *  Surchargable via `GOOGLE_CALLBACK_URL` (défaut : API Dockerisée `3007 → 3000`). */
export const GOOGLE_CALLBACK_URL =
  GOOGLE_CALLBACK_URL_ENV ?? 'http://localhost:3007/api/auth/google/callback';

@Injectable()
export class GoogleOAuthHttpAdapter implements GoogleOAuthPort {
  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID ?? '',
      redirect_uri: GOOGLE_CALLBACK_URL,
      response_type: 'code',
      scope: 'profile email',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async fetchProfile(code: string): Promise<GoogleProfile> {
    const body = new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID ?? '',
      client_secret: GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: GOOGLE_CALLBACK_URL,
      grant_type: 'authorization_code',
    });

    const tokenResponse = await fetch(
      'https://www.googleapis.com/oauth2/v4/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      },
    );

    if (!tokenResponse.ok) {
      throw new Error('Google token exchange failed');
    }

    const tokens = (await tokenResponse.json()) as { access_token?: string };
    if (!tokens.access_token) {
      throw new Error('Google token exchange failed');
    }

    const profileResponse = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    );

    if (!profileResponse.ok) {
      throw new Error('Google profile fetch failed');
    }

    const data = (await profileResponse.json()) as {
      sub?: string;
      name?: string;
      given_name?: string;
      family_name?: string;
      email?: string;
      picture?: string;
    };

    return {
      id: String(data.sub ?? ''),
      displayName: data.name,
      name: {
        givenName: data.given_name,
        familyName: data.family_name,
      },
      emails: data.email ? [{ value: data.email }] : [],
      photos: data.picture ? [{ value: data.picture }] : [],
    };
  }
}
