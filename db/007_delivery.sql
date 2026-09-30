-- Delivery fees per location. country/region are stored normalised (see lib/delivery.ts normalizeLocation).
-- Lookup order: exact country + region, then the country-wide zone (region null), then the '*' zone.
create table delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null,
  region text,
  fee_cents integer not null check (fee_cents >= 0),
  free_over_cents integer check (free_over_cents > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique nulls not distinct (country, region)
);

alter table orders add column delivery_cents integer not null default 0, add column delivery_zone text;

-- Starting rates. Edit them in /admin/delivery.
insert into delivery_zones (name, country, region, fee_cents, free_over_cents) values
  ('Lagos', 'nigeria', 'lagos', 250000, 5000000),
  ('Abuja (FCT)', 'nigeria', 'abuja', 350000, 5000000),
  ('Other states in Nigeria', 'nigeria', null, 450000, 10000000),
  ('International', '*', null, 2500000, null);
