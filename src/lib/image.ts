/**
 * Rewrite a public Cloud Storage image URL to go through the built-in image
 * transform endpoint (resize + re-encode). Non-storage URLs (data:, blob:,
 * external CDN, /__l5e/ assets) are returned untouched.
 *
 *   /storage/v1/object/public/<bucket>/<path>
 *   → /storage/v1/render/image/public/<bucket>/<path>?width=...&quality=...
 */
export function optimizeImage(
  url: string | undefined | null,
  width: number,
  opts: { quality?: number; resize?: 'cover' | 'contain' | 'fill' } = {},
): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (!url.includes('/storage/v1/object/public/')) return url;

  const transformed = url.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/',
  );
  const params = new URLSearchParams({
    width: String(Math.round(width)),
    quality: String(opts.quality ?? 70),
    resize: opts.resize ?? 'cover',
  });
  return `${transformed}?${params.toString()}`;
}

/** Build a srcset covering common DPRs for a target CSS width. */
export function optimizedSrcSet(url: string | undefined | null, width: number, opts?: { quality?: number }): string {
  if (!url) return '';
  return [1, 2]
    .map((dpr) => `${optimizeImage(url, width * dpr, opts)} ${dpr}x`)
    .join(', ');
}
