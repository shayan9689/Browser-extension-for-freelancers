/** Supported marketplace match patterns — single source of truth for the manifest. */
export const SITE_MATCHES = [
  'https://www.fiverr.com/*',
  'https://www.upwork.com/*',
] as const;

export type SiteMatch = (typeof SITE_MATCHES)[number];

export function isSupportedSite(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === 'www.fiverr.com' || hostname === 'www.upwork.com';
  } catch {
    return false;
  }
}
