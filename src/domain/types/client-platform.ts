export const CLIENT_PLATFORMS = ['web', 'android', 'ios'] as const;

export type ClientPlatform = (typeof CLIENT_PLATFORMS)[number];

export const DEFAULT_CLIENT_PLATFORM: ClientPlatform = 'web';

export function resolveClientPlatform(platform?: string): ClientPlatform {
  if (platform === 'android' || platform === 'ios') {
    return platform;
  }
  return DEFAULT_CLIENT_PLATFORM;
}
