import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-24 md:bottom-6 left-6 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 flex items-center justify-center hover:bg-primary/90 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 hover:scale-110 active:scale-95"
      aria-label="العودة للأعلى"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}
