export const GOOGLE_OAUTH = Symbol('GOOGLE_OAUTH');

export interface GoogleProfile {
  id: string;
  displayName?: string;
  name?: { givenName?: string; familyName?: string };
  emails?: { value: string }[];
  photos?: { value: string }[];
}

export interface GoogleOAuthUrlOptions {
  state?: string;
  selectAccount?: boolean;
}

export interface GoogleOAuthPort {
  getAuthorizationUrl(options?: GoogleOAuthUrlOptions): string;
  fetchProfile(code: string): Promise<GoogleProfile>;
}
