INSERT INTO public.settings(key,value) VALUES
  ('hp_limited_price','232000'),
  ('hp_limited_old_price','280000'),
  ('hp_limited_cta','اشتري الآن'),
  ('hp_limited_title','Dreame H15 Mix Aspirateur Laveur 7-en-1')
ON CONFLICT (key) DO NOTHING;