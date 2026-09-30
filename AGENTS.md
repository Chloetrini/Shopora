# AGENTS.md — Shopora

Loaded at the start of every AI session. Source of truth for what Shopora is and how it is built.
Build **one milestone at a time** (Section 6): finish it, run the checks (Section 3), stop for review.
At the end of each session ask: "Is there anything from this session that should be added here?"

## 1. Product

Shopora is a small online shop (HNG15 Lesson 2 individual task): browse products, add to a cart,
check out, persist everything in a database, email an order confirmation, sign in with Google.
The product name lives in one place, `src/constants/site.ts`.

**Payment decision:** **Paystack in test mode** (test secret key `sk_test_…`, test cards only). No real money moves,
and the UI must say "Test mode" while the key starts with `sk_test_`. Flow: the server creates the order as
`pending`, calls Paystack `transaction/initialize` (amount in the smallest unit, a unique `reference` = order id),
redirects the buyer to Paystack, then on return **verifies** the reference server-side (`transaction/verify`)
before marking the order `confirmed` and sending the email. A Paystack webhook (`x-paystack-signature`,
HMAC-SHA512 of the raw body with the secret key) is the backup if the buyer closes the tab. Confirm only when
status is `success` AND the amount and currency match the order. Never trust the browser's word that it paid.
Currency: Paystack test mode accepts NGN, so products move to `NGN` (kobo) in that milestone.

Pages: `/` (hero, categories, search, sort), `/products/[slug]`, `/cart`, `/checkout`, `/orders/[id]` (tracking timeline),
`/orders` (my orders, signed in), `/track` (guest lookup), `/login`, `/register`, `/admin/orders` (admins only, else 404).

**Guests vs signed in:** anyone can buy and is emailed. A guest follows an order with the link in the email or `/track`
(email + order number). Signed-in users see every order in `/orders`. Signing in with **Google** also claims earlier guest
orders placed with the same (Google-verified) email. Password sign-ups are never verified, so they never claim orders.

## 2. Stack

Next.js 16 (App Router), TypeScript strict (~5.9), React 19, Tailwind v4, zod v4, Vitest,
**Neon Postgres** via `@neondatabase/serverless`, **Mailgun** (HTTP API over `fetch`, no SDK), **Paystack** (HTTP API over `fetch`),
Google OAuth (authorization code + PKCE, no auth library), hosting on Vercel. Same conventions as the
sibling project Taskora (thin `page.tsx`, server code under `src/server`, `@/` imports, kebab-case files).

## 3. Commands and definition of done

```bash
npm run dev · npm run typecheck · npm run lint · npm test · npm run build
```
Done only when typecheck, lint, test and build all pass. Check UI at ~400px and desktop, light and dark.

## 4. Data (Neon project `shopora`, id `cool-voice-24183935`)

SQL lives in `db/` and is applied in order: `001_schema.sql`, `002_seed_products.sql`, `003_paystack.sql`, `004_auth.sql`, `005_tracking.sql`, `006_features.sql`, `007_delivery.sql`
(all seven are applied to the live Neon project). Amounts are minor units (kobo); the columns are still named `*_cents`.
Tables: `users`, `products`, `orders`, `order_items`. Money is **integer cents**, format only at the edge
(`lib/money.ts`). `order_items` copies name and price at purchase time. Never build SQL by string
concatenation: use the tagged template from `sql()` so values are parameters.
Env vars are read lazily so `next build` needs no secrets. See `.env.example`.

## 5. Rules

- The server computes order totals from database prices; never trust a price sent by the browser.
- Decrement stock and create the order in one transaction; fail cleanly if stock is short.
- An order belongs to a user (or a guest email). Another person's order returns 404, not 403.
- Emailed links use `APP_URL`, never the Host header. Only trust Google `email_verified: true`.
- Emails go through one `sendEmail()`; in dev without Mailgun keys it prints to the terminal;
  in production without keys checkout still succeeds and the order records `confirmation_sent_at = null`.

- **Cart** is client-only (`hooks/use-cart.ts`, localStorage key `shopora-cart`, `useSyncExternalStore` with a stable snapshot).
  Cart lines are a display snapshot; `POST /api/orders` takes only `{ productId, quantity }` plus the buyer's details
  (`orderSchema` is `.strict()`, so a client-sent price or total is rejected) and re-reads prices from `products`.
- `createOrder` (`server/db/orders.ts`) is one CTE statement: order + lines + stock decrement all-or-nothing; any line
  missing/inactive/short makes it write nothing (409 `out_of_stock`). Verified against real Neon by a test that
  rolls back (`raise exception` at the end). SQL can't run in `npm test`; re-check it that way if it changes.
- Guest orders: `/orders/[id]` is reachable by the unguessable UUID alone (noindex, no-referrer). Milestone 5 adds
  ownership for signed-in users.
- `POST /api/orders` is rate limited (20 per 15 min per IP), as are `/pay` (30) and guest tracking (20).

- **Paystack** (`server/paystack.ts`, `payments.ts`, `payment-rules.ts`): reference = `<order uuid>-<hex>`, so any payment traces
  back to its order. Return URL `GET /api/paystack/callback` and `POST /api/paystack/webhook` both call `finalizePayment`,
  which **re-verifies with Paystack** and only confirms when status, amount and currency match (`decidePayment`, unit tested).
  `confirmOrder` is a conditional update, true for exactly one caller: that caller sends the email (milestone 4).
  Set the webhook URL in the Paystack dashboard to `<APP_URL>/api/paystack/webhook`.
- Stock is taken when the order is created, so an abandoned payment holds stock. Add expiry/release in milestone 6.
- Paystack test card: `4084 0840 8408 4081`, any future expiry, CVV `408` (see Paystack's docs if it changes).

- **Email** (`server/email.service.ts`, `email-templates.ts`, `order-emails.ts`): Mailgun HTTP API over `fetch`
  (`MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM`, optional `MAILGUN_BASE_URL` for the EU region). No keys: dev prints the
  email, production skips it and checkout still works. The confirmation goes out **only for paid orders** (so typing a stranger's
  address at checkout can't make us email them), **once**: `confirmation_sent_at` is claimed with a conditional update before
  sending and released if sending fails, so a later callback/webhook retry sends it. A crash between claim and send loses it
  (rare; find them with `status='confirmed' and confirmation_sent_at is not null` and no delivery in Mailgun logs).
  Everything a buyer typed is HTML-escaped in the template. A Mailgun **sandbox** domain only delivers to recipients
  authorised in the Mailgun dashboard; use a verified domain for real customers.
- SQL that can't run in `npm test` (claims, confirm, stock) is verified on Neon inside a `do $$ ... raise exception` block so it rolls back.

- **Accounts** (`server/session.ts`, `current-user.ts`, `password.ts`, `db/users.ts`): encrypted httpOnly cookie `shopora_session`
  = `{ uid, v }` (iron-session `sealData`, 30 days). `v` is `users.session_version`; a mismatch means signed out. The user id
  comes ONLY from that cookie (`getSessionUser` in pages, `getRequestUser` in routes), never from a body, query or param.
  Passwords: bcrypt cost 12, 8 to 72 chars, one generic "Wrong email or password" (also for Google-only accounts), a dummy
  compare when the email is unknown. Login/register/Google are rate limited 10 per 15 min per IP (in memory, best effort).
- **Decisions:** no email verification for password sign-ups (`email_verified=false`), and no forgot-password yet (both are
  hardening candidates). Because of that, register says "an account with this email already exists" (it does reveal that).
  The unverified flag matters for Google: linking to an unverified password account **discards its password and bumps
  `session_version`**, so the person who pre-registered someone else's address is locked out.
- **Google** (`server/google.ts`, `google-account.ts`, `api/auth/google/*`): authorization code + PKCE + `state` (kept in the
  sealed `shopora_oauth` cookie, 10 min, sameSite lax), no auth library. Only `email_verified: true` is trusted. Lookup order: Google id,
  then email (link), else create a verified account with no password. Redirect URI (exact, in Google Cloud Console):
  `<APP_URL>/api/auth/google/callback` (and `http://localhost:3000/api/auth/google/callback` for dev). Failures redirect to
  `/login?error=<code>`. The login/register pages are `force-dynamic` so the Google button follows the env vars.
- **Orders belong to users:** a signed-in checkout stamps `orders.user_id` from the session; `/orders` lists only
  `where user_id = <session user>`. Guests still get `/orders/[id]` by unguessable id. Guest orders are NOT attached to an
  account later (even with the same email), because the email was never verified.

- **Health:** `GET /api/health` shows database connected/unreachable and which integrations are configured (words only, never a secret).
  Open it right after every deploy. It answers 503 while the database or `SESSION_SECRET` is wrong.
- `POST /api/orders` (20 per 15 min per IP) and `/pay` (30) are rate limited. Known gap: abandoned `pending` orders keep their stock
  (an expiry that cancels them would also have to cope with a buyer paying after the expiry; not built).
- `robots.txt` disallows `/api/`, `/cart`, `/checkout`, `/orders`; the sitemap lists `/`, `/login`, `/register`. New public page: add it to `app/sitemap.ts`.

## 6. Milestones

### ✅ Milestone 1: Foundation
Next.js + Tailwind + Vitest scaffold, Neon schema and seed, catalogue on `/`.
### ✅ Milestone 2: Cart and checkout
Cart (client, persisted in localStorage), checkout form, `POST /api/orders` (transaction, server-side totals, order stays `pending`), order page.
### ✅ Milestone 3: Paystack payment (test mode)
Initialize, redirect, verify on return, webhook, currency to NGN, order `pending` to `confirmed`, tests with stubbed `fetch` (wrong amount, already-confirmed, bad signature).
### ✅ Milestone 4: Confirmation emails
Mailgun `sendEmail()`, order confirmation template (HTML-escaped), tests with stubbed `fetch`.
### ✅ Milestone 5: Accounts and Google sign-in
Register/login, Google OAuth (Section 5 rules), my orders page.
### ✅ Milestone 6: Ship (code done; deploy steps in Section 7)
Vercel deploy, env vars, Google redirect URIs, health check, README.

## 6b. Tracking, admin and look (added after milestone 6)

- **Statuses** (`lib/order-status.ts`, tested): `pending` (unpaid), then paid: `confirmed` (payment received), `processing`, `shipped`,
  `out_for_delivery`, `delivered`; plus `cancelled`. "Paid" means any of the five; use `isPaidStatus`, never `=== 'confirmed'`.
  Admins move orders forward only (skipping is fine); anything not delivered can be cancelled (refunds are manual in Paystack).
  Every change adds a row to `order_events` (the timeline); the update is conditional on the status that was read, so two clicks
  apply once and email once. Emails go out for shipped, out for delivery, delivered, cancelled.
- **Admin:** `ADMIN_EMAILS` (comma list). An admin must ALSO have a verified email, so admins sign in with Google; registering an
  admin's address by password gives nothing. Non-admins get 404 from `/admin/*` and `/api/admin/*`. The admin page also has
  "Send confirmation email", which returns Mailgun's exact error text (use it to diagnose email problems; needs no log access).
- **Guest tracking:** `POST /api/orders/track` needs the email AND the first 8+ characters of the order id; one generic 404 otherwise; 20 per 15 min per IP.
- **Look:** deep teal accent, midnight ink, Fraunces (headings) and Inter; light and dark via the `dark` class (toggle in the header,
  key `shopora-theme`, pre-paint script in `app/layout.tsx`). The toggle renders both icons and lets CSS choose (no hydration mismatch).
  No orange. Tokens live in `globals.css`; product drawings use their own palette (`lib/catalog.ts` TONES).
- **Product images:** real photos are hotlinked from Unsplash (`products.image_url` =
  `https://unsplash.com/photos/<id>/download?force=true&w=900`, found by search; NOT verified from the build sandbox, which blocks
  Unsplash). `ProductImage` draws an illustration underneath and removes the photo if it fails, so a failed photo is never a broken box.
  For a dependable site, download the photos and host them (Vercel Blob or `public/`), then update `image_url`.
- **Real test order seen on the live site (30 Sep 2026):** Paystack test payment confirmed, Google account created, but the
  confirmation email was NOT sent (`confirmation_sent_at` null). Find the cause with the admin "Send confirmation email" button
  (likely: Mailgun sandbox recipient not authorised, or key/domain/from mismatch).

## 6c. Extra features (all built, SQL verified on Neon with rollback tests)

- **Delivery fees** (`lib/delivery.ts`, tested; `delivery_zones`): fee by country and state. Match order: exact state, then the whole
  country, then the `*` zone ("everywhere else"); no match means "we don't deliver there" (409, nothing written, no discount burned).
  Country/region are normalised (`Lagos State` = `lagos`, `NG` = `nigeria`, `FCT` = `abuja`). Free delivery over a threshold is judged on goods
  AFTER the discount. The fee is added to `total_cents` inside `createOrder`, so Paystack charges it. Zones are edited at `/admin/delivery`;
  checkout shows the fee live as the buyer types (the server re-computes it).
- **Discount codes** (`lib/discount.ts`, `discount_codes`): percent or fixed amount, optional max uses and expiry, claimed by a conditional UPDATE
  inside the order statement (two buyers can't both take the last use); an order never drops below ₦50 of goods. Delivery is never discounted.
  `lib/discount.ts` and the SQL mirror each other: change both together. Admin: `/admin/discounts`.
- **Wishlist** (`wishlist_items`, signed in), **reviews** (`reviews`; only customers with a PAID order containing the product; one per person,
  author shown as "Ada L."), **saved addresses** (`addresses`, max 5, default, prefilled at checkout, optional "save this address"),
  all tenant-owned: every query is scoped by the session user, another user's id is a 404.
- **Cancel an unpaid order** (`POST /api/orders/[id]/cancel`): only `pending`; gives the stock and the discount use back in one statement.
  **Stock release:** unpaid orders older than 24 h are cancelled the same way (lazily on each new order, and daily by Vercel Cron,
  `vercel.json`, which needs `CRON_SECRET`). A payment that arrives for an already cancelled order is flagged ("Paid after cancel: refund
  needed" in `/admin/orders`) and never revives the order (`decidePayment` returns `late_payment`).
- **Stock alerts:** "Email me when it's back" on sold-out products; restocking in `/admin/products` (or a cancelled order returning stock)
  emails each subscriber once. Admins (`ADMIN_EMAILS`) are emailed when an order drops a product to 5 or fewer.
- **Self-hosted photos:** `/admin/products` uploads a JPG/PNG/WebP (under 1.5 MB, type decided from the bytes) stored as base64 in
  `products.image_b64` and served from `/api/products/<slug>/image?v=`; this replaces the Unsplash hotlink for that product.
- **Email providers** (`server/email.service.ts`, tested): Mailgun first (the course requirement), then **Brevo as an automatic backup** when Mailgun
  refuses a message (`BREVO_API_KEY`, `BREVO_FROM`; the sender must be verified in Brevo). If both fail the error names both reasons. Unsent
  confirmations are retried by the daily cron and by the admin button "Send the missing emails" (`/admin/orders`, shows the provider's reason).
  DMARC caveat: a `yahoo.com` sender (p=reject) sent through Brevo/Mailgun is often rejected or filtered; use a Gmail sender or, best, a verified domain.
- **Email diagnosis:** `GET /api/health?check=email` asks Mailgun about the configured domain (read-only, no secrets, 5 per 15 min per IP)
  and explains the result; the admin "Send confirmation email" button shows Mailgun's exact error. Both live orders so far were paid but
  the confirmation was never sent, which is what these tools are for (sandbox recipient not authorised is the usual cause).
- **Header:** logo and links left; one group on the right (track, theme, cart, account), all icon buttons the same size; signed in is a
  single avatar menu (My orders, Wishlist, Saved addresses, plus the admin pages for admins).

## 7. Deployment (Vercel)

Environment variables (Project, Settings, Environment Variables; Production at least):

| Name | Required | Value |
|---|---|---|
| `DATABASE_URL` | yes | Neon connection string (Neon console, project `shopora`, Connect) |
| `SESSION_SECRET` | yes | 32+ random characters (`openssl rand -base64 32`) |
| `APP_URL` | yes | the live origin, no trailing slash, e.g. `https://shopora.vercel.app` (read at build time: redeploy after changing) |
| `PAYSTACK_SECRET_KEY` | yes for payments | `sk_test_…` while testing |
| `MAILGUN_API_KEY` | yes for email | Mailgun private API key |
| `MAILGUN_DOMAIN` | yes for email | sending domain (or sandbox domain) |
| `MAILGUN_FROM` | yes for email | `Shopora <orders@your-domain>` |
| `MAILGUN_BASE_URL` | EU only | `https://api.eu.mailgun.net` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | for Google sign-in | from Google Cloud Console |
| `ADMIN_EMAILS` | for the admin pages | your Google email(s), comma separated |
| `BREVO_API_KEY`, `BREVO_FROM` | backup email sender | Brevo API key (xkeysib-…) and `Shopora <address verified in Brevo>` |
| `CRON_SECRET` | for the daily stock-release job | any long random string; Vercel sends it to the cron route |

Never set `DISABLE_RATE_LIMIT`. After deploy: open `/api/health`; set the Paystack webhook to `<APP_URL>/api/paystack/webhook`;
add `<APP_URL>/api/auth/google/callback` to Google's authorized redirect URIs; place a test order with a Paystack test card.
Changing `SESSION_SECRET` signs everyone out.
