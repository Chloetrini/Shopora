#!/usr/bin/env bash
# One-command local setup for Shopora (Mac or Linux). Run it from the project folder:  bash setup-local.sh
set -e

say() { printf "\n\033[1m%s\033[0m\n" "$1"; }
fail() { printf "\n\033[31m%s\033[0m\n" "$1"; exit 1; }

say "1/4  Checking your tools"
command -v node >/dev/null || fail "Node.js is not installed. Download the LTS version from https://nodejs.org, install it, then run this again."
MAJOR=$(node -v | sed 's/v\([0-9]*\).*/\1/')
[ "$MAJOR" -ge 20 ] || fail "Your Node.js is too old ($(node -v)). Install the LTS version from https://nodejs.org and run this again."
command -v npm >/dev/null || fail "npm is missing. Reinstall Node.js from https://nodejs.org."
echo "Node $(node -v) and npm $(npm -v) are fine."

say "2/4  Your settings file (.env.local)"
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "Created .env.local from the template."
else
  echo ".env.local already exists, keeping it."
fi

set_value() { # set_value NAME VALUE  (replaces the line NAME=... in .env.local)
  local name="$1" value="$2" tmp
  tmp=$(mktemp)
  grep -v "^${name}=" .env.local > "$tmp" || true
  printf '%s=%s\n' "$name" "$value" >> "$tmp"
  mv "$tmp" .env.local
}
current() { grep "^$1=" .env.local | head -1 | cut -d= -f2-; }

if [ -z "$(current SESSION_SECRET)" ]; then
  SECRET=$(openssl rand -base64 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
  set_value SESSION_SECRET "$SECRET"
  echo "Made a random SESSION_SECRET for you."
fi
set_value APP_URL "http://localhost:3000"

if [ -z "$(current DATABASE_URL)" ]; then
  if [ -n "$DATABASE_URL" ]; then
    set_value DATABASE_URL "$DATABASE_URL"
  else
    echo
    echo "Paste your Neon connection string (it starts with postgresql://)."
    echo "Neon console -> your project -> Branches -> make a branch called 'dev' -> Connect -> copy the string."
    read -r -p "DATABASE_URL: " DB
    [ -n "$DB" ] || fail "No connection string given. Run this again when you have it."
    set_value DATABASE_URL "$DB"
  fi
fi
echo "Settings saved in .env.local (this file is never uploaded to GitHub)."

say "3/4  Installing the website's packages (a few minutes the first time)"
npm install

say "4/4  Installing the phone app's packages too"
(cd mobile && npm install)

say "All set"
echo "Start the website only:            npm run dev        (then open http://localhost:3000)"
echo "Start the website AND the app:     bash start-all.sh  (then scan the QR code with Expo Go on your phone)"
echo
read -r -p "Start the website now? [Y/n] " GO
case "$GO" in n|N) echo "OK. Run  npm run dev  whenever you are ready.";; *) exec npm run dev;; esac
