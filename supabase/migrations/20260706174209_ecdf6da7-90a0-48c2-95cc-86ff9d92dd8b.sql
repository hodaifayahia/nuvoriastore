
CREATE TABLE public.launchpage_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_description TEXT,
  target_audience TEXT,
  tone TEXT,
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  image_urls JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.launchpage_pages TO authenticated;
GRANT ALL ON public.launchpage_pages TO service_role;

ALTER TABLE public.launchpage_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own launchpages"
  ON public.launchpage_pages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_launchpage_pages_updated
  BEFORE UPDATE ON public.launchpage_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
