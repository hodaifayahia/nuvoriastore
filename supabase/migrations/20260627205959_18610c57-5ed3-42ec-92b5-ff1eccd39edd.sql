
-- Add brand column to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand TEXT;
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);

-- Seed brands in settings if missing
INSERT INTO public.settings (key, value)
SELECT 'brands', '[
  {"name":"Apple","image":null},
  {"name":"Samsung","image":null},
  {"name":"Dell","image":null},
  {"name":"HP","image":null},
  {"name":"Lenovo","image":null},
  {"name":"ASUS","image":null},
  {"name":"Logitech","image":null},
  {"name":"Sony","image":null},
  {"name":"JBL","image":null},
  {"name":"Anker","image":null},
  {"name":"Razer","image":null},
  {"name":"Bose","image":null}
]'::text
WHERE NOT EXISTS (SELECT 1 FROM public.settings WHERE key = 'brands');

-- Seed categories if missing
INSERT INTO public.settings (key, value)
SELECT 'categories', '[
  {"name":"Phones","icon":"Smartphone"},
  {"name":"Cases","icon":"Smartphone"},
  {"name":"Chargers","icon":"BatteryCharging"},
  {"name":"Cables","icon":"Cable"},
  {"name":"Headphones","icon":"Headphones"},
  {"name":"Keyboards","icon":"Keyboard"},
  {"name":"Mice","icon":"Mouse"},
  {"name":"Laptops","icon":"Laptop"},
  {"name":"Gaming","icon":"Gamepad2"},
  {"name":"Watches","icon":"Watch"}
]'::text
WHERE NOT EXISTS (SELECT 1 FROM public.settings WHERE key = 'categories');
