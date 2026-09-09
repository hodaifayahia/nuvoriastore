/** Detect writing direction from content (Arabic/Hebrew ranges => rtl). */
export function textDir(text: string | null | undefined): 'rtl' | 'ltr' {
  if (!text) return 'ltr';
  const sample = text.slice(0, 200);
  const rtl = (sample.match(/[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/g) || []).length;
  const ltr = (sample.match(/[A-Za-z]/g) || []).length;
  return rtl > ltr ? 'rtl' : 'ltr';
}
export function textAlignClass(text: string | null | undefined): string {
  return textDir(text) === 'rtl' ? 'text-right' : 'text-left';
}
