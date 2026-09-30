# Shopora

A small online shop: browse products, check out, get a confirmation email, sign in with Google.
Built for HNG15 Lesson 2. See `AGENTS.md` for the spec and milestones.

```bash
cp .env.example .env.local   # fill in DATABASE_URL at least
npm install
npm run dev                  # http://localhost:3000
```

Database: Neon Postgres. Apply `db/001_schema.sql`, then `db/002_seed_products.sql`.

## Payments (Paystack test mode)

Set `PAYSTACK_SECRET_KEY` to your **test** secret key (`sk_test_…`). In the Paystack dashboard set the webhook URL to
`<APP_URL>/api/paystack/webhook`. Test card: `4084 0840 8408 4081`, any future expiry, CVV `408`.
Apply `db/003_paystack.sql` and `db/004_auth.sql` after the first two SQL files.

## Confirmation emails (Mailgun)

Set `MAILGUN_API_KEY`, `MAILGUN_DOMAIN` and `MAILGUN_FROM` (`Shopora <orders@your-domain>`). A confirmation is emailed once, after
payment succeeds. Without the keys, development prints the email to the terminal. With a Mailgun sandbox domain, add the
recipient under Sending, Domain settings, Authorized recipients first.

## Google sign-in

Google Cloud Console, APIs & Services: configure the OAuth consent screen (External), then Credentials, Create credentials,
OAuth client ID, Web application. Add these Authorized redirect URIs exactly:
`http://localhost:3000/api/auth/google/callback` and `https://<your-domain>/api/auth/google/callback`.
Put the client id and secret in `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` and set `SESSION_SECRET` (32+ characters).
While the consent screen is in "Testing", only the test users you list can sign in.
