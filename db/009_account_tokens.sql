-- One outstanding link per purpose (confirm email, reset password). Only a SHA-256 hash of the token is stored,
-- with an expiry; a used link is cleared, so it works once.
alter table users
  add column verify_token_hash text,
  add column verify_token_expires timestamptz,
  add column reset_token_hash text,
  add column reset_token_expires timestamptz;
create index users_verify_token_idx on users (verify_token_hash) where verify_token_hash is not null;
create index users_reset_token_idx on users (reset_token_hash) where reset_token_hash is not null;
