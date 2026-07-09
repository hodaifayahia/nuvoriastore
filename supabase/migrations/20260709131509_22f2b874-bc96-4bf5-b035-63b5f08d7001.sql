
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_text text;

UPDATE public.products
SET price_text = regexp_replace(
  to_char((price * 100)::bigint, 'FM999999999999'),
  '(\d)(?=(\d{3})+$)', '\1,', 'g'
) || ' سنتيم'
WHERE (price_text IS NULL OR price_text = '') AND price IS NOT NULL;
