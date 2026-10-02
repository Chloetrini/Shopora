-- Deleting a product: erased for good if it was never ordered, otherwise archived (hidden everywhere, kept so old orders stay linked).
alter table products add column deleted_at timestamptz;
