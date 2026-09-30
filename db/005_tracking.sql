-- Order tracking: more statuses plus a timeline of events. "confirmed" means paid.
alter table orders drop constraint orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('pending','confirmed','processing','shipped','out_for_delivery','delivered','cancelled'));

create table order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status text not null,
  note text,
  created_at timestamptz not null default now()
);
create index order_events_order_idx on order_events (order_id, created_at);

-- One-off backfill: give orders placed before tracking existed a timeline.
with e as (
  insert into order_events (order_id, status, note, created_at)
  select id, 'pending', 'Order placed', created_at from orders o
  where not exists (select 1 from order_events x where x.order_id = o.id)
  returning order_id
)
insert into order_events (order_id, status, note, created_at)
select id, 'confirmed', 'Payment received', paid_at from orders o where paid_at is not null and o.id in (select order_id from e);
