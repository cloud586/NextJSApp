/**
 * Resolves a static asset path to a full URL or local /public fallback.
 * When NEXT_PUBLIC_ASSETS_BASE_URL is set (via App Configuration in production),
 * returns the blob/CDN URL; otherwise returns a path served from /public.
 */
export function getAssetUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_ASSETS_BASE_URL?.replace(/\/$/, "");
  const normalized = path.replace(/^\//, "");
  return base ? `${base}/${normalized}` : `/${normalized}`;
}
