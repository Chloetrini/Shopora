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

Pages (planned): `/` catalogue, `/products/[slug]`, `/cart`, `/checkout`, `/orders/[id]` (confirmation),
`/orders` (my orders), `/login`, `/register`.

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

SQL lives in `db/` and is applied in order: `001_schema.sql`, `002_seed_products.sql`, `003_paystack.sql`, `004_auth.sql`
(all four are applied to the live Neon project). Amounts are minor units (kobo); the columns are still named `*_cents`.
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
- No rate limit on `POST /api/orders` yet (Milestone 6 hardening).

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

Never set `DISABLE_RATE_LIMIT`. After deploy: open `/api/health`; set the Paystack webhook to `<APP_URL>/api/paystack/webhook`;
add `<APP_URL>/api/auth/google/callback` to Google's authorized redirect URIs; place a test order with a Paystack test card.
Changing `SESSION_SECRET` signs everyone out.
