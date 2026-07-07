import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import GeneratedLandingView, { ensureLandingFonts, LPContent, LPImages, Tone } from '@/components/landing/GeneratedLandingView';
import { useFacebookPixel } from '@/hooks/useFacebookPixel';

export default function PublicGeneratedLandingPage() {
  const { id } = useParams<{ id: string }>();
  const { trackEvent } = useFacebookPixel();

  useEffect(() => { ensureLandingFonts(); }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-lp', id],
    queryFn: async () => {
      const { data: lp, error: lpErr } = await supabase
        .from('landing_pages').select('*').eq('id', id!).maybeSingle();
      if (lpErr) throw lpErr;
      if (!lp) return null;

      const { data: product } = await supabase
        .from('products').select('id, name, price').eq('id', lp.product_id).maybeSingle();
      const { data: variants } = await supabase
        .from('product_variants').select('*').eq('product_id', lp.product_id).eq('is_active', true);

      return { lp, product, variants: variants || [] };
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (data?.lp) {
      try { trackEvent('ViewContent', { content_name: (data.lp.content as any)?.productName, content_type: 'product' }); } catch {}
    }
  }, [data?.lp, trackEvent]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">جارٍ التحميل…</div>;
  if (error || !data || !data.lp) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">الصفحة غير موجودة</div>;

  const raw = data.lp.content as any;
  const content: LPContent = raw;
  const images: LPImages = raw?._images || {
    hero: data.lp.selected_image, lifestyle: null, detail: null, inUse: null,
    before: null, after: null, packaging: null, benefit0: null, benefit1: null, benefit2: null,
  };
  const price: string = raw?._price || '';
  const tone: Tone = raw?._tone || 'Premium';
  const productPrice = Number(data.product?.price) || Number(String(price).replace(/[^\d.]/g, '')) || 0;

  return (
    <GeneratedLandingView
      content={content}
      images={images}
      price={price}
      tone={tone}
      productId={data.lp.product_id}
      productName={data.product?.name || content.productName}
      productPrice={productPrice}
      variants={data.variants}
      landingPageId={data.lp.id}
    />
  );
}
