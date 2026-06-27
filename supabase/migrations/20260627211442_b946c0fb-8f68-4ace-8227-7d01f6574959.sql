UPDATE public.settings SET value = '[
  {"name":"Phones","icon":"Smartphone","image":"/__l5e/assets-v1/5d11b4bb-4333-4125-9081-f794f736aa4a/cat-phones.jpg"},
  {"name":"Cases","icon":"Smartphone","image":"/__l5e/assets-v1/dee83cee-8c5b-420b-a654-56031f05660f/cat-cases.jpg"},
  {"name":"Chargers","icon":"BatteryCharging","image":"/__l5e/assets-v1/4eec446e-44d3-454e-806a-765c6399df9c/cat-chargers.jpg"},
  {"name":"Cables","icon":"Cable","image":"/__l5e/assets-v1/6a5f992e-841f-4aa5-9df8-766990e4f247/cat-cables.jpg"},
  {"name":"Headphones","icon":"Headphones","image":"/__l5e/assets-v1/ef533182-8a05-4888-81ac-90a6b7d206c4/cat-headphones.jpg"},
  {"name":"Keyboards","icon":"Keyboard","image":"/__l5e/assets-v1/96248336-41ec-4089-9684-98d88980587a/cat-keyboards.jpg"},
  {"name":"Mice","icon":"Mouse","image":"/__l5e/assets-v1/e8cd635b-b6f4-4073-87ea-b443e33e1b8d/cat-mice.jpg"},
  {"name":"Laptops","icon":"Laptop","image":"/__l5e/assets-v1/8a208d88-04bd-43b2-a7f7-d513bcbc473f/cat-laptops.jpg"},
  {"name":"Gaming","icon":"Gamepad2","image":"/__l5e/assets-v1/726e4a05-42db-428f-94b7-5042e5eed439/cat-gaming.jpg"},
  {"name":"Watches","icon":"Watch","image":"/__l5e/assets-v1/f2ff9929-bbba-4b89-9fa6-b5ecbfb94fef/cat-watches.jpg"}
]'::text WHERE key = 'categories';