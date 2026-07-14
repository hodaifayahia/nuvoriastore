"use client";

import * as React from "react";
import { useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBrands } from "@/hooks/useBrands";
import { useTranslation } from "@/i18n";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";
import { ShoppingBag, MessageCircle, Phone, ArrowUp, Facebook, Instagram, Send, Twitter } from "lucide-react";

// Register ScrollTrigger safely for React
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// -------------------------------------------------------------------------
// 1. THEME-ADAPTIVE INLINE STYLES
// -------------------------------------------------------------------------
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');

.cinematic-footer-wrapper {
  font-family: 'Plus Jakarta Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
  
  --pill-bg-1: color-mix(in oklch, var(--foreground) 3%, transparent);
  --pill-bg-2: color-mix(in oklch, var(--foreground) 1%, transparent);
  --pill-shadow: color-mix(in oklch, var(--background) 50%, transparent);
  --pill-highlight: color-mix(in oklch, var(--foreground) 10%, transparent);
  --pill-inset-shadow: color-mix(in oklch, var(--background) 80%, transparent);
  --pill-border: color-mix(in oklch, var(--foreground) 8%, transparent);
  
  --pill-bg-1-hover: color-mix(in oklch, var(--foreground) 8%, transparent);
  --pill-bg-2-hover: color-mix(in oklch, var(--foreground) 2%, transparent);
  --pill-border-hover: color-mix(in oklch, var(--foreground) 20%, transparent);
  --pill-shadow-hover: color-mix(in oklch, var(--background) 70%, transparent);
  --pill-highlight-hover: color-mix(in oklch, var(--foreground) 20%, transparent);
}

@keyframes footer-breathe {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
  100% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
}

@keyframes footer-scroll-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

@keyframes footer-heartbeat {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 5px color-mix(in oklch, var(--destructive) 50%, transparent)); }
  15%, 45% { transform: scale(1.2); filter: drop-shadow(0 0 10px color-mix(in oklch, var(--destructive) 80%, transparent)); }
  30% { transform: scale(1); }
}

.animate-footer-breathe {
  animation: footer-breathe 8s ease-in-out infinite alternate;
}

.animate-footer-scroll-marquee {
  animation: footer-scroll-marquee 40s linear infinite;
}

.animate-footer-heartbeat {
  animation: footer-heartbeat 2s cubic-bezier(0.25, 1, 0.5, 1) infinite;
}

/* Theme-adaptive Grid Background */
.footer-bg-grid {
  background-size: 60px 60px;
  background-image: 
    linear-gradient(to right, color-mix(in oklch, var(--foreground) 3%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in oklch, var(--foreground) 3%, transparent) 1px, transparent 1px);
  mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
}

/* Theme-adaptive Aurora Glow */
.footer-aurora {
  background: radial-gradient(
    circle at 50% 50%, 
    color-mix(in oklch, var(--primary) 15%, transparent) 0%, 
    color-mix(in oklch, var(--secondary) 15%, transparent) 40%, 
    transparent 70%
  );
}

/* Glass Pill Theming */
.footer-glass-pill {
  background: linear-gradient(145deg, var(--pill-bg-1) 0%, var(--pill-bg-2) 100%);
  box-shadow: 
      0 10px 30px -10px var(--pill-shadow), 
      inset 0 1px 1px var(--pill-highlight), 
      inset 0 -1px 2px var(--pill-inset-shadow);
  border: 1px solid var(--pill-border);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.footer-glass-pill:hover {
  background: linear-gradient(145deg, var(--pill-bg-1-hover) 0%, var(--pill-bg-2-hover) 100%);
  border-color: var(--pill-border-hover);
  box-shadow: 
      0 20px 40px -10px var(--pill-shadow-hover), 
      inset 0 1px 1px var(--pill-highlight-hover);
  color: var(--foreground);
}

/* Giant Background Text Masking */
.footer-giant-bg-text {
  font-size: 26vw;
  line-height: 0.75;
  font-weight: 900;
  letter-spacing: -0.05em;
  color: transparent;
  -webkit-text-stroke: 1px color-mix(in oklch, var(--foreground) 5%, transparent);
  background: linear-gradient(180deg, color-mix(in oklch, var(--foreground) 10%, transparent) 0%, transparent 60%);
  -webkit-background-clip: text;
  background-clip: text;
}
`;

// -------------------------------------------------------------------------
// 2. MAGNETIC BUTTON PRIMITIVE
// -------------------------------------------------------------------------
export type MagneticButtonProps = React.HTMLAttributes<HTMLElement> & {
  as?: React.ElementType;
  to?: string;
  href?: string;
  target?: string;
  rel?: string;
};

const MagneticButton = React.forwardRef<HTMLElement, MagneticButtonProps>(
  ({ className, children, as: Component = "button", ...props }, forwardedRef) => {
    const localRef = useRef<HTMLElement>(null);

    useEffect(() => {
      if (typeof window === "undefined") return;
      const element = localRef.current;
      if (!element) return;

      const ctx = gsap.context(() => {
        const handleMouseMove = (e: MouseEvent) => {
          const rect = element.getBoundingClientRect();
          const h = rect.width / 2;
          const w = rect.height / 2;
          const x = e.clientX - rect.left - h;
          const y = e.clientY - rect.top - w;

          gsap.to(element, {
            x: x * 0.4,
            y: y * 0.4,
            rotationX: -y * 0.15,
            rotationY: x * 0.15,
            scale: 1.05,
            ease: "power2.out",
            duration: 0.4,
          });
        };

        const handleMouseLeave = () => {
          gsap.to(element, {
            x: 0,
            y: 0,
            rotationX: 0,
            rotationY: 0,
            scale: 1,
            ease: "elastic.out(1, 0.3)",
            duration: 1.2,
          });
        };

        element.addEventListener("mousemove", handleMouseMove);
        element.addEventListener("mouseleave", handleMouseLeave);

        return () => {
          element.removeEventListener("mousemove", handleMouseMove);
          element.removeEventListener("mouseleave", handleMouseLeave);
        };
      }, element);

      return () => ctx.revert();
    }, []);

    return (
      <Component
        ref={(node: HTMLElement) => {
          (localRef as any).current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) (forwardedRef as any).current = node;
        }}
        className={cn("cursor-pointer select-none", className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
MagneticButton.displayName = "MagneticButton";

// -------------------------------------------------------------------------
// 3. BRAND MARQUEE ITEM
// -------------------------------------------------------------------------
const MarqueeItem = ({ brands, fallback }: { brands: any[] | undefined, fallback: any[] }) => {
  const list = brands && brands.length > 0 ? brands : fallback;
  return (
    <div className="flex items-center space-x-16 px-8">
      {list.map((brand, i) => (
        <React.Fragment key={i}>
          <div className="flex items-center gap-3 shrink-0">
            {brand.image ? (
              <img
                src={brand.image}
                alt={brand.name}
                className="h-6 sm:h-8 w-auto object-contain max-w-[100px] dark:brightness-200 dark:contrast-200"
              />
            ) : (
              <span className="font-display font-extrabold text-sm sm:text-base uppercase tracking-wider text-foreground">
                {brand.name}
              </span>
            )}
          </div>
          <span className="text-primary/60 text-lg">✦</span>
        </React.Fragment>
      ))}
    </div>
  );
};

// -------------------------------------------------------------------------
// 4. MAIN CINEMATIC FOOTER COMPONENT
// -------------------------------------------------------------------------
export function CinematicFooter() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const giantTextRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const { t, language } = useTranslation();
  const isAr = language === 'ar';

  const { data: brandsData } = useBrands();
  const fallbackBrands = useMemo(() => [
    { name: 'Samsung' }, { name: 'LG' }, { name: 'Bosch' }, { name: 'Condor' }, { name: 'Brandt' }
  ], []);

  const { data: settings } = useQuery({
    queryKey: ['footer-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('settings').select('*').in('key', [
        'store_name', 'facebook_url', 'instagram_url', 'tiktok_url', 'whatsapp_number', 'copyright_text',
        'telegram_url', 'twitter_url', 'footer_description'
      ]);
      const map: Record<string, string> = {};
      data?.forEach(s => { map[s.key] = s.value || ''; });
      return map;
    },
  });

  const storeName = 'NuvoriaStore';
  const description =
    settings?.footer_description ||
    (isAr
      ? 'متجر متخصص في الأجهزة الكهرومنزلية والإلكترونيات بأفضل الأسعار في الجزائر.'
      : 'Boutique spécialisée en électroménager et électronique aux meilleurs prix en Algérie.');

  const whatsappHref = settings?.whatsapp_number
    ? `https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}`
    : '';

  const TikTokIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V9.11a8.16 8.16 0 0 0 4.77 1.52V7.19a4.85 4.85 0 0 1-1.84-.5z"/>
    </svg>
  );

  const socials = [
    { url: settings?.instagram_url, Icon: Instagram, label: 'Instagram' },
    { url: settings?.facebook_url, Icon: Facebook, label: 'Facebook' },
    { url: settings?.tiktok_url, Icon: TikTokIcon, label: 'TikTok' },
    { url: whatsappHref, Icon: MessageCircle, label: 'WhatsApp' },
    { url: settings?.twitter_url, Icon: Twitter, label: 'Twitter' },
    { url: settings?.telegram_url, Icon: Send, label: 'Telegram' },
  ].filter(s => s.url);

  const columns = isAr
    ? [
        {
          title: 'المتجر',
          links: [
            { to: '/', label: 'الرئيسية' },
            { to: '/products', label: 'المنتجات' },
            { to: '/cart', label: 'السلة' },
          ],
        },
        {
          title: 'الشركة',
          links: [
            { to: '/about', label: 'من نحن' },
            { to: '/track', label: 'تتبع الطلب' },
            { to: '/contact', label: 'اتصل بنا' },
            { to: '/faq', label: 'الأسئلة الشائعة' },
          ],
        },
        {
          title: 'موارد',
          links: [
            { to: '/auth', label: 'حسابي' },
            { to: '/returns', label: 'الإرجاع والاستبدال' },
            { to: '/warranty', label: 'الضمان' },
            { to: '/privacy', label: 'الخصوصية' },
          ],
        },
      ]
    : [
        {
          title: 'Boutique',
          links: [
            { to: '/', label: 'Accueil' },
            { to: '/products', label: 'Produits' },
            { to: '/cart', label: 'Panier' },
          ],
        },
        {
          title: 'Entreprise',
          links: [
            { to: '/about', label: 'À propos' },
            { to: '/track', label: 'Suivi de commande' },
            { to: '/contact', label: 'Contact' },
            { to: '/faq', label: 'FAQ' },
          ],
        },
        {
          title: 'Ressources',
          links: [
            { to: '/auth', label: 'Mon compte' },
            { to: '/returns', label: 'Retours et échanges' },
            { to: '/warranty', label: 'Garantie' },
            { to: '/privacy', label: 'Confidentialité' },
          ],
        },
      ];

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!wrapperRef.current) return;

    const ctx = gsap.context(() => {
      // Background Parallax
      gsap.fromTo(
        giantTextRef.current,
        { y: "10vh", scale: 0.8, opacity: 0 },
        {
          y: "0vh",
          scale: 1,
          opacity: 1,
          ease: "power1.out",
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: "top 80%",
            end: "bottom bottom",
            scrub: 1,
          },
        }
      );

      // Staggered Content Reveal
      gsap.fromTo(
        contentRef.current,
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: "top 40%",
            end: "bottom bottom",
            scrub: 1,
          },
        }
      );
    }, wrapperRef);

    return () => ctx.revert();
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      
      <div
        ref={wrapperRef}
        className="relative h-[120vh] md:h-screen w-full"
        style={{ clipPath: "polygon(0% 0, 100% 0%, 100% 100%, 0 100%)" }}
      >
        <footer className="fixed bottom-0 left-0 flex h-[120vh] md:h-screen w-full flex-col justify-between overflow-y-auto md:overflow-hidden bg-background text-foreground cinematic-footer-wrapper py-6 md:py-10 z-0">
          
          {/* Ambient Light & Grid Background */}
          <div className="footer-aurora absolute left-1/2 top-1/2 h-[60vh] w-[80vw] -translate-x-1/2 -translate-y-1/2 animate-footer-breathe rounded-[50%] blur-[80px] pointer-events-none z-0" />
          <div className="footer-bg-grid absolute inset-0 z-0 pointer-events-none" />

          {/* Giant background text */}
          <div
            ref={giantTextRef}
            className="footer-giant-bg-text absolute -bottom-[2vh] left-1/2 -translate-x-1/2 whitespace-nowrap z-0 pointer-events-none select-none"
          >
            NUVORIA
          </div>

          {/* 1. Diagonal Sleek Marquee (Top of footer) with Brands */}
          <div className="absolute top-12 left-0 w-full overflow-hidden border-y border-border/50 bg-background/60 backdrop-blur-md py-4 z-10 -rotate-2 scale-110 shadow-2xl">
            <div className="flex w-max animate-footer-scroll-marquee text-xs md:text-sm font-bold tracking-[0.3em] text-muted-foreground uppercase">
              <MarqueeItem brands={brandsData} fallback={fallbackBrands} />
              <MarqueeItem brands={brandsData} fallback={fallbackBrands} />
            </div>
          </div>

          {/* 2. Main Center Content - Redesigned columns */}
          <div 
            ref={contentRef}
            className="relative z-10 flex-1 flex flex-col justify-center px-4 sm:px-6 md:px-8 mt-24 md:mt-20 w-full max-w-6xl mx-auto space-y-8 md:space-y-10"
          >
            {/* Title / Heading set to pure black */}
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-black dark:text-white tracking-tighter text-center uppercase">
              {isAr ? 'جاهز للتسوق؟' : 'Prêt à commander ?'}
            </h2>

            {/* Premium Grid layout for socials and links */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 text-left" dir={isAr ? 'rtl' : 'ltr'}>
              
              {/* Brand description & dynamic contacts (5 cols) */}
              <div className="md:col-span-5 space-y-5">
                <h3 className="font-display font-extrabold text-2xl tracking-tight text-black dark:text-white">
                  NuvoriaStore
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground/80 leading-relaxed max-w-sm">
                  {description}
                </p>

                {/* Premium Contact Details Card */}
                {settings?.whatsapp_number && (
                  <div className="footer-glass-pill p-4 sm:p-5 rounded-2xl border border-white/10 shadow-sm flex items-center gap-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                        {isAr ? 'الدعم الهاتفي' : 'Support Client'}
                      </span>
                      <a 
                        href={`tel:${settings.whatsapp_number.replace(/\D/g, '')}`} 
                        className="block font-cairo font-black text-sm sm:text-base text-black dark:text-white hover:text-orange-500 transition-colors"
                      >
                        {settings.whatsapp_number}
                      </a>
                    </div>
                  </div>
                )}

                {/* Premium Social Media Icons Grid */}
                {socials.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3">
                    {socials.map(({ url, Icon, label }) => (
                      <MagneticButton
                        key={label}
                        as="a"
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-glass-pill p-3 rounded-full text-muted-foreground hover:text-orange-500 hover:border-orange-500/30 flex items-center justify-center transition-all bg-white/40 dark:bg-slate-900/40"
                        title={label}
                      >
                        <Icon className="w-4.5 h-4.5" />
                      </MagneticButton>
                    ))}
                  </div>
                )}
              </div>

              {/* Link Columns (7 cols) */}
              <div className="md:col-span-7 grid grid-cols-3 gap-4 sm:gap-6">
                {columns.map(col => (
                  <div key={col.title} className="space-y-4">
                    <h4 className="font-display font-bold text-[10px] sm:text-xs uppercase tracking-widest text-black dark:text-white border-b pb-2 border-black/10 dark:border-white/10">
                      {col.title}
                    </h4>
                    <ul className="space-y-3">
                      {col.links.map(link => (
                        <li key={link.to}>
                          <Link
                            to={link.to}
                            className="text-[11px] sm:text-xs text-muted-foreground hover:text-orange-500 transition-all block py-0.5 hover:translate-x-1 duration-200 transform"
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Bottom Bar / Credits */}
          <div className="relative z-20 w-full pb-4 px-4 sm:px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-border/40 pt-4">
            
            {/* Copyright */}
            <div className="text-muted-foreground text-[10px] sm:text-xs font-semibold tracking-widest uppercase order-2 md:order-1">
              {settings?.copyright_text || `© 2026 NuvoriaStore. ${t('footer.rightsReserved') || 'Tous droits réservés.'}`}
            </div>

            {/* "Made with Love" Badge */}
            <div className="footer-glass-pill px-5 py-2 rounded-full flex items-center gap-2 order-1 md:order-2 cursor-default border-border/50 bg-white/40 dark:bg-slate-900/40">
              <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Crafted with</span>
              <span className="animate-footer-heartbeat text-xs text-destructive">❤</span>
              <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">by</span>
              <span className="text-foreground font-black text-xs tracking-normal ml-1">NuvoriaStore</span>
            </div>

            {/* Back to top */}
            <MagneticButton
              as="button"
              onClick={scrollToTop}
              className="w-10 h-10 rounded-full footer-glass-pill flex items-center justify-center text-muted-foreground hover:text-foreground group order-3"
            >
              <ArrowUp className="w-4.5 h-4.5 transform group-hover:-translate-y-1.5 transition-transform duration-300" />
            </MagneticButton>

          </div>
        </footer>
      </div>
    </>
  );
}
