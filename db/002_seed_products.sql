insert into products (slug, name, description, price_cents, category, stock) values
  ('canvas-tote', 'Canvas tote bag', 'Sturdy cotton tote with an inside pocket.', 1800, 'bags', 40),
  ('ceramic-mug', 'Ceramic mug', 'Hand-glazed 350 ml mug, dishwasher safe.', 1400, 'home', 60),
  ('desk-lamp', 'Desk lamp', 'Warm LED lamp with a dimmer and USB port.', 3900, 'home', 25),
  ('notebook-set', 'Notebook set', 'Three dotted A5 notebooks, recycled paper.', 1200, 'stationery', 80),
  ('steel-bottle', 'Steel water bottle', 'Insulated 750 ml bottle, keeps drinks cold 24 h.', 2400, 'outdoors', 50),
  ('wool-beanie', 'Wool beanie', 'Soft merino beanie, one size.', 2200, 'clothing', 35)
on conflict (slug) do nothing;
