create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null,
  google_id text unique,
  password_hash text,
  email_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  price_cents integer not null check (price_cents >= 0),
  currency char(3) not null default 'USD',
  image_url text,
  category text not null default 'general',
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index products_active_category_idx on products (active, category);

create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  email text not null,
  full_name text not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  region text,
  postal_code text not null,
  country text not null,
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled')),
  total_cents integer not null check (total_cents >= 0),
  currency char(3) not null default 'USD',
  confirmation_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index orders_user_idx on orders (user_id, created_at desc);

-- name and unit_price_cents are copied at purchase time so old orders survive product edits.
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  name text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity > 0)
);
create index order_items_order_idx on order_items (order_id);
