# Run Shopora on your own computer

You need a computer with **Node.js 22** (https://nodejs.org, the LTS download) and **Git** (https://git-scm.com).
Check them in a terminal: `node -v` should say v22 or higher, `git --version` should print a version.

## Fastest way (Mac or Linux)

After step 1 below, run **one command** in the project folder and it does steps 2 and 3 for you (it asks you for the Neon connection string):

```bash
bash setup-local.sh
```

It installs the website **and** the phone app, then offers to start the website. Next time, run `bash start-all.sh` to start the website and the app together (it finds your Wi-Fi address and prints a QR code for Expo Go).

## 1. Get the code

```bash
git clone https://github.com/Chloetrini/Shopora.git
cd Shopora
npm install
```

The default branch (`chloe/milestone-1-foundation`) has everything: the website in the main folder, the phone app in `mobile/`.

## 2. Fill in your settings

```bash
cp .env.example .env.local
```

Open `.env.local` in any editor and fill it in. `.env.local` is never committed to Git (it is in `.gitignore`). What each line needs:

| Setting | Where to get it | Needed to run? |
|---|---|---|
| `DATABASE_URL` | Neon console, your project, **Connect**, copy the connection string. **Use a Neon branch for testing** (Branches, Create branch) so local testing never touches the live shop's data | Yes |
| `SESSION_SECRET` | In a terminal: `openssl rand -base64 32` | Yes |
| `APP_URL` | Leave as `http://localhost:3000` | Yes |
| `PAYSTACK_SECRET_KEY` | Paystack, Settings, API Keys & Webhooks, **test** secret key (`sk_test_…`) | Only to pay |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud Console, Credentials. Add `http://localhost:3000/api/auth/google/callback` to the client's **Authorized redirect URIs** | Only for Google sign-in |
| `ADMIN_EMAILS` | Your own Google email, so you can open the admin pages | Only for admin |
| `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM` | Mailgun dashboard. Without them, emails are **printed in the terminal** instead of sent, which is handy locally | Optional |

Vercel hides the values of sensitive settings, so you can't copy them back out of Vercel. Take them from Neon, Paystack, Google and Mailgun directly. A new `SESSION_SECRET` is fine; it only means logins on your computer are separate from the live site.

## 3. Start it

```bash
npm run dev
```

Open http://localhost:3000. Other useful commands: `npm test` (all tests), `npm run typecheck`, `npm run lint`, `npm run build`.

## 4. The phone app against your local website (optional)

On the same Wi-Fi as your phone:

```bash
cd mobile
npm install
EXPO_PUBLIC_API_URL=http://YOUR-COMPUTER-IP:3000 npx expo start
```

Find your computer's IP in Wi-Fi settings (something like `192.168.1.10`). Scan the QR code with your phone's camera and open it in **Expo Go**.
Leave out `EXPO_PUBLIC_API_URL` and the app talks to the live site (https://www.shopora.website) instead.

## Good to know

- Local logins and carts are separate from the live site unless you point `DATABASE_URL` at the live database. Don't do that for experiments.
- Payments work locally in test mode (test card `4084 0840 8408 4081`, any future date, CVV `408`), but Paystack can't call your computer's webhook, so the order is confirmed when you come back from the Paystack page, which is enough for testing.
- Real keys never go in the repository. If a key is ever pasted somewhere public, make a new one and delete the old one.
