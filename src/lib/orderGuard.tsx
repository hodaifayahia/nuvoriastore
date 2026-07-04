import { useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const MIN_FORM_TIME_MS = 3000;
export const GUEST_ORDER_LIMIT = 2;

export type OrderGuardResult =
  | { ok: true }
  | { ok: false; reason: 'bot' | 'too_fast' | 'guest_limit'; message: string };

export function useOrderGuard() {
  const loadedAt = useRef<number>(Date.now());
  const honeypotRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { loadedAt.current = Date.now(); }, []);

  const HoneypotField = useMemo(() => {
    // Off-screen (not display:none — some bots skip hidden inputs)
    const style: React.CSSProperties = {
      position: 'absolute',
      left: '-9999px',
      top: 'auto',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
      opacity: 0,
      pointerEvents: 'none',
    };
    // Render as a function to attach the ref
    const Field = () => (
      <div aria-hidden="true" style={style}>
        <label>
          Website (leave blank)
          <input
            ref={honeypotRef}
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>
    );
    return Field;
  }, []);

  const verify = async (opts: { phone: string; userId?: string | null }): Promise<OrderGuardResult> => {
    // 1. Honeypot check
    if (honeypotRef.current && honeypotRef.current.value) {
      return { ok: false, reason: 'bot', message: 'حدث خطأ. يرجى إعادة تحميل الصفحة والمحاولة.' };
    }
    // 2. Timing check
    const elapsed = Date.now() - loadedAt.current;
    if (elapsed < MIN_FORM_TIME_MS) {
      return {
        ok: false,
        reason: 'too_fast',
        message: 'يرجى مراجعة تفاصيل الطلب قبل الإرسال.',
      };
    }
    // 3. Guest order limit
    if (!opts.userId) {
      const phone = (opts.phone || '').trim();
      if (phone) {
        const { data, error } = await supabase.rpc('count_guest_orders_for_phone', { p_phone: phone });
        if (!error && typeof data === 'number' && data >= GUEST_ORDER_LIMIT) {
          return {
            ok: false,
            reason: 'guest_limit',
            message: `لقد وصلت للحد الأقصى (${GUEST_ORDER_LIMIT}) من الطلبات كزائر. الرجاء إنشاء حساب بالبريد الإلكتروني للمتابعة.`,
          };
        }
      }
    }
    return { ok: true };
  };

  return { HoneypotField, verify };
}
