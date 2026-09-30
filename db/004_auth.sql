-- Sessions are stateless cookies {uid, v}. Bumping session_version signs the account out everywhere
-- (used when Google takes over an unverified password account).
alter table users add column session_version integer not null default 0;
