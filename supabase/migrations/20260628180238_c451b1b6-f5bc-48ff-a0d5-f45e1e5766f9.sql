
-- ============================================================
-- 1) CONFIRMERS — explicit SELECT policies
-- ============================================================
DROP POLICY IF EXISTS "Admin can select confirmers" ON public.confirmers;
CREATE POLICY "Admin can select confirmers"
  ON public.confirmers
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Confirmer can read own row" ON public.confirmers;
CREATE POLICY "Confirmer can read own row"
  ON public.confirmers
  FOR SELECT
  TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());

-- ============================================================
-- 2) ORDERS — explicit SELECT policies for admin and confirmer
-- ============================================================
DROP POLICY IF EXISTS "Admin can read all orders" ON public.orders;
CREATE POLICY "Admin can read all orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Confirmer can read orders" ON public.orders;
CREATE POLICY "Confirmer can read orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'confirmer'::app_role));

-- ============================================================
-- 3) SETTINGS — explicit is_public allowlist
-- ============================================================
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Backfill: anything that currently passes the keyword filter is treated
-- as public, so existing storefront reads keep working unchanged.
UPDATE public.settings
   SET is_public = true
 WHERE key NOT IN ('telegram_bot_token','telegram_chat_id')
   AND key !~~* '%token%'
   AND key !~~* '%secret%'
   AND key !~~* '%api_key%'
   AND key !~~* '%password%'
   AND key !~~* '%credential%'
   AND key !~~* '%webhook%'
   AND key !~~* 'private_%'
   AND key !~~* '%_sk%'
   AND key !~~* '%_pk_live%'
   AND key !~~* '%client_secret%'
   AND key !~~* '%access_key%'
   AND key !~~* '%signing%'
   AND key !~~* '%jwt%';

-- Replace the keyword-only policy with an explicit allowlist.
DROP POLICY IF EXISTS "Public can read non-sensitive settings" ON public.settings;
CREATE POLICY "Public can read public settings"
  ON public.settings
  FOR SELECT
  TO anon, authenticated
  USING (
    is_public = true
    AND key NOT IN ('telegram_bot_token','telegram_chat_id')
    AND key !~~* '%token%'
    AND key !~~* '%secret%'
    AND key !~~* '%api_key%'
    AND key !~~* '%password%'
    AND key !~~* '%credential%'
    AND key !~~* '%webhook%'
    AND key !~~* 'private_%'
  );
