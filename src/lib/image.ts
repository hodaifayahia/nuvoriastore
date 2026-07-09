/**
 * Rewrite a public Cloud Storage image URL to go through the built-in image
 * transform endpoint (resize + re-encode to modern format via Accept
 * negotiation — WebP/AVIF fallbacks to JPEG). Non-storage URLs (data:, blob:,
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
    quality: String(opts.quality ?? 65),
    resize: opts.resize ?? 'cover',
  });
  return `${transformed}?${params.toString()}`;
}

/**
 * Build a responsive `srcset` covering common device widths so the browser can
 * pick the smallest file that fills the layout slot. Widths are in CSS pixels.
 */
export function optimizedSrcSet(
  url: string | undefined | null,
  widths: number[] = [160, 240, 320, 480, 640, 800],
  opts?: { quality?: number },
): string {
  if (!url) return '';
  return widths.map((w) => `${optimizeImage(url, w, opts)} ${w}w`).join(', ');
}

/** Tiny (blurred) placeholder URL, ~24px wide, low quality. */
export function placeholderImage(url: string | undefined | null): string {
  return optimizeImage(url, 24, { quality: 20 });
}

/**
 * In-memory cache of image URLs the browser has already decoded during this
 * session — used to skip the fade-in animation when revisiting a screen so the
 * UI never flashes for a photo the user has already seen.
 */
const loadedImages = new Set<string>();
export function markImageLoaded(url: string) {
  if (url) loadedImages.add(url);
}
export function isImageLoaded(url: string | undefined | null): boolean {
  return !!url && loadedImages.has(url);
}
