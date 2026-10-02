-- The shopping cart of a signed-in buyer, kept on the server so the website and the phone app share it.
-- Only the product and the quantity are stored; names and prices are always read from products.
create table cart_items (
  user_id uuid not null references users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity integer not null check (quantity between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
