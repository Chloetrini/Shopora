# Shopora

A small online shop with a website and an Android/iOS phone app that share one API and one database: browse products, check out with
Paystack, get a confirmation email (Mailgun), sign in with Google or email, track orders, and manage the shop as an admin.
Built for HNG15 Lessons 2 and 3. See `AGENTS.md` for the spec and milestones, and `SUBMISSION.md` for the submission notes.

- Website: https://www.shopora.website
- Phone app: `mobile/` (Expo). The cart, login and orders are the same as the website's; add to the cart on one and it shows on the other within seconds.

```bash
cp .env.example .env.local   # fill in DATABASE_URL at least
npm install
npm run dev                  # http://localhost:3000
```

Database: Neon Postgres. Apply `db/001_schema.sql`, then `db/002_seed_products.sql`.

## Payments (Paystack test mode)

Set `PAYSTACK_SECRET_KEY` to your **test** secret key (`sk_test_…`). In the Paystack dashboard set the webhook URL to
`<APP_URL>/api/paystack/webhook`. Test card: `4084 0840 8408 4081`, any future expiry, CVV `408`.
Apply `db/003_paystack.sql`, `db/004_auth.sql`, `db/005_tracking.sql`, `db/006_features.sql` and `db/007_delivery.sql` after the first two SQL files.

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

## Order tracking and admin

Buyers follow an order on `/orders/<id>` (link in their email), on `/track` (email + order number), or in My orders when signed in.
Set `ADMIN_EMAILS` to your Google email, sign in with Google, and open `/admin/orders` to move orders through processing, shipped,
out for delivery and delivered. Each of those (and cancel) emails the buyer.

## Admin

With `ADMIN_EMAILS` set and signed in with Google: `/admin/orders` (status, resend the confirmation email), `/admin/products` (stock, hide,
upload photos), `/admin/discounts` and `/admin/delivery`. If order emails don't arrive, open `/api/health?check=email`.

## Phone app

See `mobile/README.md`. Run it with `cd mobile && npm install && npx expo start`, or publish an update with
`npx eas-cli update --branch preview --environment preview --message "…" --platform all`.
Build the installable Android file with `npx eas-cli build -p android --profile preview`.
