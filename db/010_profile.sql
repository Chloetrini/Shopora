-- Profile: phone number and photo. The photo is stored on the user row (a cropped 512 px picture is a few dozen KB)
-- and served only to its owner, so deleting the account deletes it too.
alter table users
  add column phone text,
  add column avatar_b64 text,
  add column avatar_type text,
  add column avatar_updated_at timestamptz;
