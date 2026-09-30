-- Wishlist, reviews, discount codes, saved addresses, stock alerts, self-hosted product photos.
create table wishlist_items (
  user_id uuid not null references users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  author_name text not null,
  rating integer not null check (rating between 1 and 5),
  body text not null default '' check (char_length(body) <= 1000),
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
create index reviews_product_idx on reviews (product_id, created_at desc);

create table discount_codes (
  code text primary key check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,20}$'),
  percent_off integer check (percent_off between 1 and 90),
  amount_off_cents integer check (amount_off_cents > 0),
  active boolean not null default true,
  expires_at timestamptz,
  max_uses integer check (max_uses > 0),
  used_count integer not null default 0,
  created_at timestamptz not null default now(),
  check ((percent_off is null) <> (amount_off_cents is null))
);

alter table orders add column subtotal_cents integer, add column discount_code text,
  add column discount_cents integer not null default 0;
update orders set subtotal_cents = total_cents where subtotal_cents is null;

create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  label text not null default '',
  full_name text not null,
  address_line1 text not null,
  address_line2 text not null default '',
  city text not null,
  region text not null default '',
  postal_code text not null,
  country text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index addresses_user_idx on addresses (user_id, created_at);

create table stock_alerts (
  product_id uuid not null references products(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  primary key (product_id, email)
);

-- Photos uploaded in the admin are stored as base64 text and served from /api/products/<slug>/image.
alter table products add column image_b64 text, add column image_type text;
