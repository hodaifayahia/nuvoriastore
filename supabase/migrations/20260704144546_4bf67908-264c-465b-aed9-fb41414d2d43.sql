INSERT INTO public.settings (key, value) VALUES (
  'categories',
  '[{"name":"تبريد","icon":"BatteryCharging"},{"name":"طبخ","icon":"Cpu"},{"name":"غسيل","icon":"Cable"},{"name":"أجهزة صغيرة","icon":"Headphones"},{"name":"تكييف","icon":"Speaker"}]'
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;