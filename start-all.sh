#!/usr/bin/env bash
# Starts the website AND the phone app's development server on your computer. Run from the project folder:  bash start-all.sh
# Needs the one-time setup first:  bash setup-local.sh
set -e
fail() { printf "\n\033[31m%s\033[0m\n" "$1"; exit 1; }

[ -f .env.local ] || fail "No .env.local yet. Run  bash setup-local.sh  first."
[ -d node_modules ] || fail "Packages are not installed yet. Run  bash setup-local.sh  first."
[ -d mobile/node_modules ] || (cd mobile && npm install)

# Your computer's address on the Wi-Fi, so the phone can reach the website running here.
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')
[ -n "$IP" ] || fail "Could not find your Wi-Fi address. Connect to Wi-Fi and try again."

cleanup() { [ -n "$WEB_PID" ] && kill "$WEB_PID" 2>/dev/null; }
trap cleanup EXIT INT TERM

printf "\n\033[1mStarting the website on http://localhost:3000 ...\033[0m\n"
npm run dev > .web.log 2>&1 &
WEB_PID=$!
for i in $(seq 1 60); do
  if curl -s -o /dev/null http://localhost:3000; then break; fi
  sleep 1
done
echo "Website is up: http://localhost:3000   (log: .web.log)"

printf "\n\033[1mStarting the phone app. It will use your local website at http://%s:3000\033[0m\n" "$IP"
echo "Phone and computer must be on the same Wi-Fi. Open Expo Go on the phone and scan the QR code below."
cd mobile
EXPO_PUBLIC_API_URL="http://$IP:3000" npx expo start --lan
