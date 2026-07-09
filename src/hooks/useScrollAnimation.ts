import { useEffect, useRef, useState } from 'react';

export function useScrollAnimation(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      setIsVisible(true);
      return;
    }

    // Respect reduced-motion users — show immediately.
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setIsVisible(true);
      return;
    }

    // If IntersectionObserver is unsupported, just show.
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        // Trigger earlier so fast scrolling doesn't leave elements hidden.
        rootMargin: '200px 0px 200px 0px',
      }
    );

    observer.observe(el);

    // Safety net: if the observer hasn't fired quickly (fast scroll past,
    // element already off-screen, etc.), reveal the content anyway.
    const fallback = window.setTimeout(() => {
      setIsVisible(true);
      observer.disconnect();
    }, 600);

    return () => {
      window.clearTimeout(fallback);
      observer.disconnect();
    };
  }, [threshold]);

  return { ref, isVisible };
}
