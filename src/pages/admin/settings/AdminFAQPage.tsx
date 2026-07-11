import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, HelpCircle, ArrowUp, ArrowDown } from 'lucide-react';

type Faq = {
  id: string;
  question: string;
  answer: string;
  question_fr: string | null;
  answer_fr: string | null;
  sort_order: number;
  is_active: boolean;
};

export default function AdminFAQPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Faq | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ['admin-faqs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as Faq[];
    },
  });

  const upsertFaq = useMutation({
    mutationFn: async (payload: Partial<Faq> & { id?: string }) => {
      if (payload.id) {
        const { error } = await supabase.from('faqs').update({
          question: payload.question, answer: payload.answer,
          question_fr: payload.question_fr, answer_fr: payload.answer_fr,
          sort_order: payload.sort_order, is_active: payload.is_active,
        } as any).eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('faqs').insert({
          question: payload.question || '',
          answer: payload.answer || '',
          question_fr: payload.question_fr || null,
          answer_fr: payload.answer_fr || null,
          sort_order: payload.sort_order ?? (faqs.length + 1),
          is_active: payload.is_active ?? true,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-faqs'] });
      qc.invalidateQueries({ queryKey: ['public-faqs'] });
      setEditing(null); setCreating(false);
      toast({ title: 'تم الحفظ ✅' });
    },
    onError: (e: any) => toast({ title: 'فشل الحفظ', description: e.message, variant: 'destructive' }),
  });

  const deleteFaq = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('faqs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-faqs'] });
      qc.invalidateQueries({ queryKey: ['public-faqs'] });
      setDeleteId(null);
      toast({ title: 'تم الحذف' });
    },
  });

  const move = async (faq: Faq, dir: -1 | 1) => {
    const idx = faqs.findIndex(f => f.id === faq.id);
    const swap = faqs[idx + dir];
    if (!swap) return;
    await supabase.from('faqs').update({ sort_order: swap.sort_order }).eq('id', faq.id);
    await supabase.from('faqs').update({ sort_order: faq.sort_order }).eq('id', swap.id);
    qc.invalidateQueries({ queryKey: ['admin-faqs'] });
    qc.invalidateQueries({ queryKey: ['public-faqs'] });
  };

  return (
    <div className="space-y-6 max-w-4xl p-4 md:p-6" dir="rtl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-cairo font-bold text-2xl flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-primary" />
            الأسئلة الشائعة
          </h1>
          <p className="font-cairo text-sm text-muted-foreground mt-1">
            أضف السؤال والإجابة بالعربية والفرنسية. تظهر النسخة المطابقة للغة الزائر.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} className="font-cairo gap-2">
          <Plus className="w-4 h-4" /> إضافة سؤال
        </Button>
      </div>

      {isLoading ? (
        <p className="font-cairo text-sm text-muted-foreground">جاري التحميل...</p>
      ) : faqs.length === 0 ? (
        <div className="border border-dashed rounded-2xl p-12 text-center">
          <HelpCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-cairo text-muted-foreground">لا توجد أسئلة بعد. ابدأ بإضافة أول سؤال.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={faq.id} className="bg-card border rounded-2xl p-4 md:p-5 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-roboto font-bold text-sm shrink-0">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-cairo font-semibold text-foreground">{faq.question}</p>
                  {!faq.is_active && (
                    <span className="text-[10px] font-cairo bg-muted text-muted-foreground px-2 py-0.5 rounded-full">مخفي</span>
                  )}
                  {(!faq.question_fr || !faq.answer_fr) && (
                    <span className="text-[10px] font-cairo bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">FR ناقص</span>
                  )}
                </div>
                <p className="font-cairo text-sm text-muted-foreground leading-relaxed line-clamp-2">{faq.answer}</p>
                {faq.question_fr && (
                  <p className="font-cairo text-xs text-muted-foreground/80 mt-1 italic line-clamp-1" dir="ltr">FR: {faq.question_fr}</p>
                )}
              </div>
              <div className="flex flex-col items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(faq, -1)} disabled={i === 0}>
                  <ArrowUp className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(faq, 1)} disabled={i === faqs.length - 1}>
                  <ArrowDown className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => setEditing(faq)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(faq.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <FaqDialog
        open={creating || !!editing}
        faq={editing}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSave={(payload) => upsertFaq.mutate(payload)}
        saving={upsertFaq.isPending}
      />

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-cairo">حذف السؤال؟</AlertDialogTitle>
            <AlertDialogDescription className="font-cairo">
              لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-cairo">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="font-cairo bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteFaq.mutate(deleteId)}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FaqDialog({
  open, faq, onClose, onSave, saving,
}: {
  open: boolean;
  faq: Faq | null;
  onClose: () => void;
  onSave: (p: Partial<Faq> & { id?: string }) => void;
  saving: boolean;
}) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [questionFr, setQuestionFr] = useState('');
  const [answerFr, setAnswerFr] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (open) {
      setQuestion(faq?.question || '');
      setAnswer(faq?.answer || '');
      setQuestionFr(faq?.question_fr || '');
      setAnswerFr(faq?.answer_fr || '');
      setIsActive(faq?.is_active ?? true);
    }
  }, [open, faq]);

  const submit = () => {
    if (!question.trim() || !answer.trim()) return;
    onSave({
      id: faq?.id,
      question: question.trim(),
      answer: answer.trim(),
      question_fr: questionFr.trim() || null,
      answer_fr: answerFr.trim() || null,
      is_active: isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-cairo">{faq ? 'تعديل السؤال' : 'إضافة سؤال جديد'}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="ar" className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="ar" className="font-cairo">العربية 🇩🇿</TabsTrigger>
            <TabsTrigger value="fr" className="font-cairo">Français 🇫🇷</TabsTrigger>
          </TabsList>

          <TabsContent value="ar" className="space-y-4 mt-4">
            <div>
              <Label className="font-cairo text-sm">السؤال (بالعربية)</Label>
              <Input value={question} onChange={e => setQuestion(e.target.value)} className="font-cairo mt-1" placeholder="مثال: كيف يمكنني تتبع طلبي؟" dir="rtl" />
            </div>
            <div>
              <Label className="font-cairo text-sm">الإجابة (بالعربية)</Label>
              <Textarea value={answer} onChange={e => setAnswer(e.target.value)} className="font-cairo mt-1" rows={5} placeholder="اكتب إجابة واضحة ومفيدة..." dir="rtl" />
            </div>
          </TabsContent>

          <TabsContent value="fr" className="space-y-4 mt-4">
            <div>
              <Label className="font-cairo text-sm">Question (Français)</Label>
              <Input value={questionFr} onChange={e => setQuestionFr(e.target.value)} className="mt-1" placeholder="Ex: Comment suivre ma commande ?" dir="ltr" />
            </div>
            <div>
              <Label className="font-cairo text-sm">Réponse (Français)</Label>
              <Textarea value={answerFr} onChange={e => setAnswerFr(e.target.value)} className="mt-1" rows={5} placeholder="Rédigez une réponse claire et utile..." dir="ltr" />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/20 mt-2">
          <div>
            <p className="font-cairo text-sm font-semibold">إظهار السؤال</p>
            <p className="font-cairo text-xs text-muted-foreground">عند الإيقاف لن يظهر السؤال للعملاء.</p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="font-cairo">إلغاء</Button>
          <Button onClick={submit} disabled={saving || !question.trim() || !answer.trim()} className="font-cairo">
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
