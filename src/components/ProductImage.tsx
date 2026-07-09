import { useState, useRef, useEffect } from 'react';
import { ShoppingCart } from 'lucide-react';
import {
  optimizeImage,
  optimizedSrcSet,
  placeholderImage,
  isImageLoaded,
  markImageLoaded,
} from '@/lib/image';

interface ProductImageProps {
  src: string | undefined | null;
  alt: string;
  /** Rendered CSS width used to pick the base variant (default 400). */
  width?: number;
  /** `sizes` attribute matching the layout — defaults to a product-grid tuned value. */
  sizes?: string;
  className?: string;
  /** Eager load the first LCP-candidate image; everything else stays lazy. */
  priority?: boolean;
  /** Explicit intrinsic dimensions to prevent CLS. */
  intrinsicWidth?: number;
  intrinsicHeight?: number;
}

/**
 * Lazy, responsive, blur-up product image.
 *
 * - Serves WebP/AVIF via the storage render endpoint (negotiated by Accept).
 * - Delivers per-viewport variants through `srcset` + `sizes`.
 * - Uses `loading="lazy"` + `decoding="async"` so off-screen images never
 *   block the main thread on mobile.
 * - Shows a low-res blurred placeholder + skeleton pulse while decoding.
 * - Skips the fade animation for URLs already decoded this session (cache).
 * - Sets `width`/`height` attributes so the browser reserves layout space.
 */
export default function ProductImage({
  src,
  alt,
  width = 400,
  sizes = '(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 300px',
  className = '',
  priority = false,
  intrinsicWidth = 400,
  intrinsicHeight = 300,
}: ProductImageProps) {
  const cached = isImageLoaded(src);
  const [loaded, setLoaded] = useState(cached);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Handle images that are already complete before the load event binds
  // (browser HTTP cache path).
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      if (src) markImageLoaded(src);
      setLoaded(true);
    }
  }, [src]);

  if (!src) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/10 ${className}`}>
        <ShoppingCart className="w-10 h-10 text-muted-foreground/30" />
      </div>
    );
  }

  const placeholder = placeholderImage(src);

  return (
    <>
      {!loaded && (
        <>
          {/* Blurred low-res preview */}
          {placeholder && (
            <img
              src={placeholder}
              alt=""
              aria-hidden="true"
              className={`absolute inset-0 w-full h-full object-cover scale-110 blur-xl ${className}`}
              draggable={false}
            />
          )}
          {/* Skeleton shimmer over the blur */}
          <div className="absolute inset-0 bg-muted/40 animate-pulse" aria-hidden="true" />
        </>
      )}
      <img
        ref={imgRef}
        src={optimizeImage(src, width)}
        srcSet={optimizedSrcSet(src)}
        sizes={sizes}
        alt={alt}
        width={intrinsicWidth}
        height={intrinsicHeight}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        onLoad={() => { markImageLoaded(src); setLoaded(true); }}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      />
    </>
  );
}
