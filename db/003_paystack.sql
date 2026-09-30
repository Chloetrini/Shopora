-- Paystack test mode charges in Naira. Amounts stay integers in the smallest unit (kobo);
-- the column is still called price_cents / total_cents, read it as "minor units".
alter table products alter column currency set default 'NGN';
alter table orders   alter column currency set default 'NGN';
update products set currency = 'NGN', price_cents = price_cents * 1000 where currency = 'USD';

-- The latest Paystack reference, for support. The reference itself is "<order id>-<random hex>",
-- so a payment can always be traced to its order even if the buyer starts a second attempt.
alter table orders add column paystack_reference text;
alter table orders add column paid_at timestamptz;
