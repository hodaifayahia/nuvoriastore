-- Mark storefront-visible settings as public so anon users can read them.
UPDATE public.settings
SET is_public = true
WHERE key IN (
  'categories',
  'hero_slides',
  'store_template',
  'brands',
  'homepage_settings'
) OR key LIKE 'hp_%';