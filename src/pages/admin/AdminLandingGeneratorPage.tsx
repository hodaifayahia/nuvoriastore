import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Download, RefreshCw, Wand2, Star, ArrowRight, Check, Rocket, ShieldCheck, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Tone = 'Premium' | 'Playful' | 'Clinical' | 'Bold';

interface Content {
  headline: string;
  subheadline: string;
  ctaText: string;
  benefits: { title: string; description: string }[];
  before: string;
  after: string;
  testimonials: { name: string; quote: string; role: string }[];
  howItWorks: { step: string; title: string; description: string }[];
  trustBadges: string[];
}
interface Images {
  hero: string | null;
  before: string | null;
  after: string | null;
  mechanism: string | null;
}

const TONE_THEMES: Record<Tone, { from: string; to: string; accent: string; ring: string }> = {
  Premium:  { from: '#0f172a', to: '#1e1b4b', accent: '#c9a24a', ring: 'ring-amber-300/40' },
  Playful:  { from: '#fef3c7', to: '#fbcfe8', accent: '#ec4899', ring: 'ring-pink-300/50' },
  Clinical: { from: '#f8fafc', to: '#e0f2fe', accent: '#0284c7', ring: 'ring-sky-300/50' },
  Bold:     { from: '#1a1a1a', to: '#7c1d1d', accent: '#ef4444', ring: 'ring-red-400/50' },
};

const AVATAR_GRADIENTS = [
  'from-amber-400 to-rose-500',
  'from-sky-400 to-indigo-600',
  'from-emerald-400 to-teal-600',
];

function ensurePlayfair() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('lp-playfair-font')) return;
  const l = document.createElement('link');
  l.id = 'lp-playfair-font';
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=Inter:wght@300;400;500;600;700&display=swap';
  document.head.appendChild(l);
}

function SkeletonPage() {
  return (
    <div className="space-y-16 animate-pulse">
      <section className="grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <Skeleton className="h-14 w-3/4 rounded-xl" />
          <Skeleton className="h-6 w-full rounded-lg" />
          <Skeleton className="h-6 w-2/3 rounded-lg" />
          <Skeleton className="h-12 w-40 rounded-xl mt-4" />
        </div>
        <Skeleton className="aspect-square rounded-3xl" />
      </section>
      <section className="grid md:grid-cols-2 gap-6">
        <Skeleton className="aspect-[4/3] rounded-3xl" />
        <Skeleton className="aspect-[4/3] rounded-3xl" />
      </section>
      <section className="grid md:grid-cols-3 gap-6">
        {[0,1,2].map((i) => <Skeleton key={i} className="h-56 rounded-3xl" />)}
      </section>
    </div>
  );
}

function Editable({ value, onChange, className, as: Tag = 'span' as any }: any) {
  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      onBlur={(e: any) => onChange(e.currentTarget.innerText)}
      className={`outline-none focus:ring-2 focus:ring-offset-2 rounded-md transition ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: value }}
    />
  );
}

export default function AdminLandingGeneratorPage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [tone, setTone] = useState<Tone>('Premium');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<Content | null>(null);
  const [images, setImages] = useState<Images>({ hero: null, before: null, after: null, mechanism: null });
  const [prompts, setPrompts] = useState<any>(null);
  const [regenLoading, setRegenLoading] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const productName = (content as any)?.productName || 'Product';

  useEffect(() => { ensurePlayfair(); }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) console.warn('anon sign-in failed:', error.message);
      }
    })();
  }, []);

  const theme = TONE_THEMES[tone];

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image too large (max 8MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setUploadedImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadedImage) {
      toast.error('Please upload a product photo');
      return;
    }
    setLoading(true);
    setContent(null);
    setImages({ hero: null, before: null, after: null, mechanism: null });
    try {
      const { data, error } = await supabase.functions.invoke('generate-landing-page', {
        body: {
          referenceImage: uploadedImage,
          price: price.trim(),
          tone,
          mode: 'full',
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setContent(data.content);
      setImages(data.images);
      setPrompts(data.prompts);
      toast.success('Landing page generated');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  async function regenerateImage(section: keyof Images) {
    if (section === 'hero') {
      toast.info('Hero uses your uploaded photo — upload a new one to change it');
      return;
    }
    if (!prompts?.[section]) return;
    setRegenLoading(section);
    try {
      const { data, error } = await supabase.functions.invoke('generate-landing-page', {
        body: { mode: 'image', section, imagePrompt: prompts[section] },
      });
      if (error) throw error;
      if (data?.image) setImages((s) => ({ ...s, [section]: data.image }));
      toast.success(`${section} image regenerated`);
    } catch (err: any) {
      toast.error(err.message || 'Regeneration failed');
    } finally {
      setRegenLoading(null);
    }
  }

  async function regenerateText() {
    setRegenLoading('text');
    try {
      const { data, error } = await supabase.functions.invoke('generate-landing-page', {
        body: { referenceImage: uploadedImage, price, tone, mode: 'text' },
      });
      if (error) throw error;
      if (data?.content) setContent(data.content);
      toast.success('Copy regenerated');
    } catch (err: any) {
      toast.error(err.message || 'Regeneration failed');
    } finally {
      setRegenLoading(null);
    }
  }


  function updateContent(patch: Partial<Content>) {
    setContent((c) => (c ? { ...c, ...patch } : c));
  }

  function exportHTML() {
    if (!previewRef.current) return;
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${productName}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
<style>body{font-family:'Inter',system-ui,sans-serif}.font-serif-lux{font-family:'Playfair Display',serif}</style>
</head>
<body>${previewRef.current.innerHTML}</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${productName.toLowerCase().replace(/\s+/g, '-')}-landing.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div dir="ltr" className="min-h-screen bg-gradient-to-b from-slate-50 to-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-3" style={{ fontFamily: "'Playfair Display', serif" }}>
              <span className="inline-flex w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                <Rocket className="w-5 h-5" />
              </span>
              LaunchPage AI
            </h1>
            <p className="text-slate-500 mt-2">Generate a complete, high-converting product landing page in seconds.</p>
          </div>
          {content && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={regenerateText} disabled={regenLoading === 'text'}>
                {regenLoading === 'text' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                Regenerate copy
              </Button>
              <Button onClick={exportHTML} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <Download className="w-4 h-4 mr-2" /> Export HTML
              </Button>
            </div>
          )}
        </div>

        {/* Input form */}
        <Card className="p-6 sm:p-8 mb-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 bg-white/80 backdrop-blur">
          <form onSubmit={handleGenerate} className="grid md:grid-cols-3 gap-5">
            <div className="md:col-span-3 space-y-2">
              <Label>Product Photo *</Label>
              <label className="relative flex items-center justify-center h-56 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 cursor-pointer overflow-hidden transition group">
                {uploadedImage ? (
                  <>
                    <img src={uploadedImage} alt="uploaded" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-sm font-medium transition">
                      Click to replace
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mx-auto mb-3 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <p className="font-medium text-slate-700">Upload a product photo</p>
                    <p className="text-xs text-slate-500 mt-1">PNG or JPG, up to 8MB</p>
                  </div>
                )}
                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
              </label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input id="price" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. $49" className="rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
                <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Premium">Premium — luxury, editorial</SelectItem>
                  <SelectItem value="Playful">Playful — vibrant, fun</SelectItem>
                  <SelectItem value="Clinical">Clinical — clean, scientific</SelectItem>
                  <SelectItem value="Bold">Bold — high-contrast, confident</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={loading || !uploadedImage} className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white text-base shadow-lg shadow-indigo-500/30">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</> : <><Sparkles className="w-4 h-4 mr-2" />Generate</>}
              </Button>
            </div>
          </form>

        </Card>

        {/* Preview */}
        {loading && <SkeletonPage />}
        {content && (
          <div ref={previewRef} className="bg-white rounded-3xl overflow-hidden shadow-2xl shadow-slate-200/60 border border-slate-100">
            {/* HERO */}
            <section
              className="relative overflow-hidden px-6 sm:px-14 py-16 sm:py-24"
              style={{ background: `linear-gradient(135deg, ${theme.from} 0%, ${theme.to} 100%)` }}
            >
              <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-30" style={{ background: theme.accent }} />
              <div className="relative grid md:grid-cols-2 gap-10 items-center max-w-6xl mx-auto">
                <div className={tone === 'Playful' || tone === 'Clinical' ? 'text-slate-900' : 'text-white'}>
                  <span className="inline-flex items-center gap-2 text-xs uppercase tracking-widest px-3 py-1 rounded-full backdrop-blur bg-white/10 border border-white/20 mb-6">
                    <Sparkles className="w-3 h-3" /> New arrival
                  </span>
                  <Editable
                    as="h1"
                    value={content.headline}
                    onChange={(v: string) => updateContent({ headline: v })}
                    className="text-4xl sm:text-6xl leading-tight font-bold mb-6 block"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  />
                  <Editable
                    as="p"
                    value={content.subheadline}
                    onChange={(v: string) => updateContent({ subheadline: v })}
                    className="text-lg sm:text-xl opacity-90 mb-8 block leading-relaxed"
                  />
                  <div className="flex flex-wrap items-center gap-4">
                    <button className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold shadow-2xl transition hover:scale-105" style={{ background: theme.accent, color: '#fff' }}>
                      <Editable value={content.ctaText} onChange={(v: string) => updateContent({ ctaText: v })} className="inline" />
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    {price && (
                      <div className="text-3xl sm:text-4xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                        {price}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mt-8 text-sm opacity-80">
                    <div className="flex">{[0,1,2,3,4].map((i) => <Star key={i} className="w-4 h-4 fill-current" />)}</div>
                    <span>4.9 · 2,100+ reviews</span>
                  </div>
                </div>
                <div className="relative">
                  <div className={`aspect-square rounded-[2.5rem] overflow-hidden ring-1 ring-white/20 shadow-2xl ${theme.ring}`}>
                    {images.hero ? (
                      <img src={images.hero} alt={productName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-white/10 animate-pulse" />
                    )}
                  </div>
                  <Button size="sm" variant="secondary" className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full shadow-lg" onClick={() => regenerateImage('hero')} disabled={regenLoading === 'hero'}>
                    {regenLoading === 'hero' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />} Regenerate
                  </Button>
                </div>
              </div>
            </section>

            {/* BENEFITS */}
            <section className="px-6 sm:px-14 py-20 max-w-6xl mx-auto">
              <div className="grid md:grid-cols-3 gap-6">
                {content.benefits.slice(0, 3).map((b, i) => (
                  <div key={i} className="p-6 rounded-3xl border border-slate-100 bg-gradient-to-b from-white to-slate-50 shadow-sm hover:shadow-xl transition">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: `${theme.accent}20`, color: theme.accent }}>
                      {i === 0 ? <Zap className="w-5 h-5" /> : i === 1 ? <ShieldCheck className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                    </div>
                    <Editable as="h3" value={b.title} onChange={(v: string) => updateContent({ benefits: content.benefits.map((x, j) => j === i ? { ...x, title: v } : x) })} className="text-xl font-bold mb-2 block" style={{ fontFamily: "'Playfair Display', serif" }} />
                    <Editable as="p" value={b.description} onChange={(v: string) => updateContent({ benefits: content.benefits.map((x, j) => j === i ? { ...x, description: v } : x) })} className="text-slate-600 leading-relaxed block" />
                  </div>
                ))}
              </div>
            </section>

            {/* BEFORE / AFTER */}
            <section className="px-6 sm:px-14 py-20 bg-slate-50">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-3xl sm:text-5xl font-bold text-center mb-14" style={{ fontFamily: "'Playfair Display', serif" }}>The Transformation</h2>
                <div className="grid md:grid-cols-2 gap-8">
                  {(['before', 'after'] as const).map((k) => (
                    <div key={k} className="relative rounded-3xl overflow-hidden shadow-xl bg-white group">
                      <div className="aspect-[4/3] relative">
                        {images[k] ? (
                          <img src={images[k]!} alt={k} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-slate-200 animate-pulse" />
                        )}
                        <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest" style={{ background: k === 'before' ? '#64748b' : theme.accent, color: '#fff' }}>{k}</div>
                        <Button size="sm" variant="secondary" className="absolute top-3 right-3 rounded-full opacity-0 group-hover:opacity-100 transition" onClick={() => regenerateImage(k)} disabled={regenLoading === k}>
                          {regenLoading === k ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        </Button>
                      </div>
                      <div className="p-6">
                        <Editable as="p" value={content[k]} onChange={(v: string) => updateContent({ [k]: v } as any)} className="text-slate-700 leading-relaxed block" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* AUTHORITY & SOCIAL PROOF */}
            <section className="px-6 sm:px-14 py-20 max-w-6xl mx-auto">
              <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 pb-14 border-b border-slate-100 mb-14 opacity-70">
                {content.trustBadges.slice(0, 4).map((b, i) => (
                  <Editable key={i} value={b} onChange={(v: string) => updateContent({ trustBadges: content.trustBadges.map((x, j) => j === i ? v : x) })} className="text-sm font-semibold uppercase tracking-widest text-slate-500" />
                ))}
              </div>
              <h2 className="text-3xl sm:text-5xl font-bold text-center mb-12" style={{ fontFamily: "'Playfair Display', serif" }}>Loved by thousands</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {content.testimonials.slice(0, 3).map((t, i) => (
                  <div key={i} className="p-6 rounded-3xl border border-slate-100 bg-white shadow-sm hover:shadow-lg transition">
                    <div className="flex mb-3" style={{ color: theme.accent }}>{[0,1,2,3,4].map((s) => <Star key={s} className="w-4 h-4 fill-current" />)}</div>
                    <Editable as="p" value={`"${t.quote}"`} onChange={(v: string) => updateContent({ testimonials: content.testimonials.map((x, j) => j === i ? { ...x, quote: v.replace(/^"|"$/g, '') } : x) })} className="text-slate-700 italic mb-6 leading-relaxed block" />
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[i % 3]} flex items-center justify-center text-white font-bold`}>
                        {t.name.charAt(0)}
                      </div>
                      <div>
                        <Editable value={t.name} onChange={(v: string) => updateContent({ testimonials: content.testimonials.map((x, j) => j === i ? { ...x, name: v } : x) })} className="font-semibold text-slate-900 block" />
                        <Editable value={t.role} onChange={(v: string) => updateContent({ testimonials: content.testimonials.map((x, j) => j === i ? { ...x, role: v } : x) })} className="text-xs text-slate-500 block" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* INGREDIENTS / MECHANISM */}
            <section className="px-6 sm:px-14 py-20 bg-gradient-to-b from-slate-50 to-white">
              <div className="max-w-6xl mx-auto">
                <div className="grid md:grid-cols-2 gap-10 items-center mb-16">
                  <div className="relative">
                    <div className="aspect-square rounded-[2.5rem] overflow-hidden shadow-xl">
                      {images.mechanism ? (
                        <img src={images.mechanism} alt="mechanism" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-200 animate-pulse" />
                      )}
                    </div>
                    <Button size="sm" variant="secondary" className="absolute top-3 right-3 rounded-full" onClick={() => regenerateImage('mechanism')} disabled={regenLoading === 'mechanism'}>
                      {regenLoading === 'mechanism' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    </Button>
                  </div>
                  <div>
                    <h2 className="text-3xl sm:text-5xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>How it works</h2>
                    <p className="text-slate-600 leading-relaxed">A simple three-step ritual, engineered for consistent results.</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  {content.howItWorks.slice(0, 3).map((step, i) => (
                    <div key={i} className="relative p-6 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-lg transition">
                      <div className="w-12 h-12 rounded-2xl text-white font-bold flex items-center justify-center mb-4" style={{ background: theme.accent }}>{step.step}</div>
                      <Editable as="h3" value={step.title} onChange={(v: string) => updateContent({ howItWorks: content.howItWorks.map((x, j) => j === i ? { ...x, title: v } : x) })} className="text-lg font-bold mb-2 block" style={{ fontFamily: "'Playfair Display', serif" }} />
                      <Editable as="p" value={step.description} onChange={(v: string) => updateContent({ howItWorks: content.howItWorks.map((x, j) => j === i ? { ...x, description: v } : x) })} className="text-slate-600 leading-relaxed block" />
                      {i < 2 && <ArrowRight className="w-5 h-5 text-slate-300 absolute top-1/2 -right-3 hidden md:block" />}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* FINAL CTA */}
            <section className="px-6 sm:px-14 py-20 text-center text-white" style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}>
              <h2 className="text-3xl sm:text-5xl font-bold mb-4 max-w-2xl mx-auto" style={{ fontFamily: "'Playfair Display', serif" }}>Ready to transform?</h2>
              <p className="opacity-80 mb-8 max-w-xl mx-auto">Join thousands who made the switch. Risk-free 30-day guarantee.</p>
              <button className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl font-semibold shadow-2xl hover:scale-105 transition" style={{ background: theme.accent, color: '#fff' }}>
                {content.ctaText} <ArrowRight className="w-4 h-4" />
              </button>
            </section>
          </div>
        )}

        {!loading && !content && (
          <Card className="p-16 text-center rounded-3xl border-dashed border-2 border-slate-200 bg-white/50">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 mx-auto mb-4 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Your landing page will appear here</h3>
            <p className="text-slate-500">Fill in the product details above and click Generate.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
