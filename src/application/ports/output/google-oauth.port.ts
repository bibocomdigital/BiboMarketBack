export const GOOGLE_OAUTH = Symbol('GOOGLE_OAUTH');

export interface GoogleProfile {
  id: string;
  displayName?: string;
  name?: { givenName?: string; familyName?: string };
  emails?: { value: string }[];
  photos?: { value: string }[];
}

export interface GoogleOAuthPort {
  getAuthorizationUrl(): string;
  fetchProfile(code: string): Promise<GoogleProfile>;
}
