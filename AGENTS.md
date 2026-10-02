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

SQL lives in `db/` and is applied in order: `001_schema.sql`, `002_seed_products.sql`, `003_paystack.sql`, `004_auth.sql`, `005_tracking.sql`, `006_features.sql`, `007_delivery.sql`, `008_cart.sql`, `009_account_tokens.sql`, `010_profile.sql`
(all ten are applied to the live Neon project). Amounts are minor units (kobo); the columns are still named `*_cents`.
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

### 🟡 Lesson 3 — the phone app (HNG15; website stays as it is)
A real mobile app (Expo / React Native, in `mobile/`; the root `tsc`, eslint and the Vercel build ignore that folder) that uses **the same API and database** as the website.
A user logs in on both; adding to the cart on the web shows up on the phone almost at once (and the other way round).
- **Milestone 7 ✅ Server cart + token login + JSON endpoints** (this section's API). Done when: typecheck, lint, test, build pass; cart SQL verified on Neon with a rollback test.
- **Milestone 8 ✅ Mobile app** (`mobile/`, Expo SDK 57 + React Navigation): shop with search and categories, product page, login/register,
  server cart (polled every 2 s), checkout with saved address and discount code, Paystack in the in-app browser, my orders with live status.
  Signed-out visitors can browse; adding to the cart sends them to log in (the cart belongs to the account). Done when: `tsc` and
  `expo export --platform android` pass, the token login test passes. **Not yet tried on a real phone** (that is milestone 9).
- **Milestone 10 ✅ Admin in the app**: an **Admin** tab, shown only when `user.isAdmin`, with Orders (move status, cancel, resend email, send missing emails), Products
  (add, stock, hide/show, photo from the gallery, shrunk to 1400 px JPEG on the phone) and Discounts (create, on/off). It uses the same admin endpoints as the website;
  the new `GET` list endpoints answer 404 to non-admins (test in `admin-api.test.ts`).
- **Milestone 11 ✅ Account emails and passwords** (website and app): sign-up by email sends **"Welcome to Shopora: confirm your email"** (24 h, single-use link,
  `/verify-email` waits for a click); a **new Google account** gets **"Welcome to Shopora"** (already verified); **Forgot password** (`/forgot-password`, link 30 min, single-use,
  `/reset-password`; the answer is identical for known and unknown emails; 5 per 15 min per IP and 3 per 15 min per address) also lets a Google-only account **add** a password.
  A reset signs the account out everywhere, doesn't sign this device in, and counts as proof of the address. **An unconfirmed email never blocks login**: a banner (website)
  / notice (app) offers Resend (`POST /api/auth/resend-verification`, 3 per 15 min). Tokens: 256 random bits, only the SHA-256 hash stored (`users.*_token_hash/_expires`,
  `server/tokens.ts`, `db/account-tokens.ts`, `account-email.ts`); links are built from `siteUrl()`, never the Host header; the new password is validated before the link is used up.
  Existing accounts are **not** mass-verified (that would let an unverified password account be taken over via Google); they just see the banner. Tests: `account-flow.test.ts`.
- **Milestone 12 ✅ Profile** (website `/profile`, app Account → Edit profile): photo (centre-cropped to 512 px JPEG in the browser/phone, stored on the user row
  (`avatar_b64`, `avatar_type`, `avatar_updated_at`), served only to its owner from `GET /api/users/me/avatar?v=…`, type decided from the bytes, ≤ 1.5 MB), full name, phone
  (optional, `phoneField`), the email shown read-only with a confirmed badge (changing the email would break sign-in and order emails, so it is not offered), change password
  (needs the current one; a Google-only account may **add** one; bumps `session_version`, so other devices are signed out while this one gets a fresh cookie / the app a fresh
  token), delete account (password, or typing the email for a Google-only account; cart, wishlist and addresses cascade; **past orders stay** because `orders.user_id` is
  `on delete set null`). The avatar shows in the website menu and the app header. Tests: `profile-api.test.ts` (signed out = 401 everywhere, strict bodies, wrong password, type sniffing).
- **Milestone 9 🟡 Phone testing**: published with EAS Update (Expo account `chloetrini`, project `@chloetrini/shopora`, id `2bfc96ad-2189-4eed-8ab2-cf773801ac1f`,
  branch `preview`). Open in Expo Go: `exp://u.expo.dev/2bfc96ad-2189-4eed-8ab2-cf773801ac1f/group/<update group id>` or the QR on the update's page
  in the Expo dashboard. **Still to do by hand:** test on a real phone, web to phone cart sync both ways. To publish a new version:
  `cd mobile && EXPO_TOKEN=… npx eas-cli update --branch preview --environment preview --message "…" --platform all --non-interactive`
  (the token is only ever an environment secret, never in the repo; Expo domains must be allowed in the session's network settings).

**Cart (signed in = server, guest = browser).** Table `cart_items(user_id, product_id, quantity)`; names and prices are always
joined from `products`. `CartProvider` (`hooks/use-cart.ts`, mounted in the `(shop)` layout) shows a change at once, sends it,
and replaces its copy with the server's answer; it polls `GET /api/cart` every 2 s while the tab is visible and refreshes on focus.
A guest's `localStorage` cart is merged into the account cart (`PUT /api/cart`, larger quantity wins) the first time they are signed in.
Every cart answer carries the whole cart `{ items }`. Creating an order clears the buyer's server cart. All cart queries are scoped
by the session's `userId` (rule 1); other users' carts are unreachable by construction (there is no id in the URL but the product's).

**Token login for the app.** Same `/api/auth/login` and `/api/auth/register`; when the request has the header
`x-shopora-client: mobile` the body also contains `token` (the same sealed session as the cookie). The app sends
`Authorization: Bearer <token>`; `getRequestUser` accepts the cookie first, then the bearer. The web never receives the token
(its cookie is httpOnly on purpose). Logging out on the phone = deleting the token.

**Google sign-in for the app** (`server/app-auth.ts`): the app opens `GET /api/auth/google?app_redirect=<shopora:// or exp:// link>&app_challenge=<PKCE
challenge>` in the secure browser sheet (`WebBrowser.openAuthSessionAsync`). The website's Google flow runs unchanged (same Google redirect URI, nothing new in
Google Cloud Console); at the end the callback redirects to the app link with a **one-time code** (sealed with its own key, 2 minutes) or `?error=<code>`,
never the session. The app trades `{ code, verifier }` at `POST /api/auth/google/app` for `{ user, token }`; the code is useless without the verifier whose
hash the app sent first, so another app catching the link gains nothing. Only `shopora:`, `exp:` and `exps:` return links are accepted.

**Signing the payment browser in** (`openPayment` in the app): the secure browser the app opens for Paystack has no cookie, so the website there looked signed
out ("Log in" in the header). The app first calls `POST /api/auth/handoff` (bearer token) for a 60-second code (own key), then opens
`GET /api/auth/handoff?code=…&next=/api/orders/<id>/pay` in the browser: that sets the normal session cookie and `GET …/pay` starts the payment and redirects to
Paystack, so the page you return to shows your account avatar. If the hand-off fails the app opens Paystack's URL directly.

| Method & path | Auth | Returns |
|---|---|---|
| `POST /api/auth/google/app` | – `{ code, verifier }` | `{ user, token }` (the app's Google sign-in, see above) |
| `POST /api/auth/handoff` | ✓ | `{ code }` (60 s) for `GET /api/auth/handoff?code&next` which sets the cookie and redirects (same-site `next` only) |
| `GET /api/admin/orders`, `GET /api/admin/products`, `GET /api/admin/discounts` | admin | the lists for the app's Admin tab (orders carry `next`: the statuses each may move to); anyone else gets 404 |
| `POST /api/auth/verify-email` | – `{ token }` | `{ email }`; 400 `invalid_token` |
| `POST /api/auth/resend-verification` | ✓ | sends a new confirm link (3 per 15 min) |
| `POST /api/auth/forgot-password` | – `{ email }` | same message whether or not the account exists |
| `POST /api/auth/reset-password` | – `{ token, newPassword }` | 200, or 400 `invalid_token`; no session cookie |
| `PATCH /api/users/me` | ✓ `{ fullName?, phone? }` (strict) | `{ user }` |
| `DELETE /api/users/me` | ✓ `{ password }` or `{ confirmEmail }` | account deleted, cookie cleared |
| `PATCH /api/users/me/password` | ✓ `{ currentPassword?, newPassword }` | fresh cookie (and `token` for the app); "Password changed" / "Password set" |
| `GET/PUT/DELETE /api/users/me/avatar` | ✓ | the picture to its owner / save raw bytes / remove |
| `GET /api/cart` | ✓ | `{ items }` (CartItem + `slug`, `imageUrl`, `stock`) |
| `POST /api/cart` | ✓ `{ productId, quantity }` | adds; 404 unknown product, 409 `cart_full` (20 lines) |
| `PUT /api/cart` | ✓ `{ items: [{ productId, quantity }] }` | merges a guest cart |
| `PATCH /api/cart/[productId]` | ✓ `{ quantity }` | sets the quantity; 0 removes |
| `DELETE /api/cart/[productId]`, `DELETE /api/cart` | ✓ | removes a line / empties the cart |
| `GET /api/products`, `GET /api/products/[slug]` | – | `{ products }` / `{ product }` |
| `POST /api/admin/products` | admin `{ name, description?, priceNaira, stock, category }` | 201 `{ id, slug }`; the slug comes from the name (`-2`, `-3` if taken); the photo is uploaded afterwards via `PUT /api/admin/products/[id]/image` |
| `GET /api/orders` | ✓ | `{ orders }` (my orders) |
| `GET /api/orders/[id]` | – (the unguessable id is the key) | `{ order }` with items and timeline |

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
- **Images load plainly:** no drawn stand-ins. `ProductImage` shows a grey pulsing skeleton until the photo is ready and fades it in; no photo or a failed one is a neutral box with an icon. `(shop)/loading.tsx` is the page-level skeleton. The hero has no border (a smooth gradient, no radial glow: that had visible hard edges).
- **Product images (history):** real photos are hotlinked from Unsplash (`products.image_url` =
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
- **Layouts:** route groups. `(shop)` has the navbar and footer; `(auth)` (login, register) has neither, only the name above the card;
  the 404 and error pages are bare too. New public shop pages go in `(shop)`.
- **Header:** logo and links left; one group on the right (track, theme, cart, account), all icon buttons the same size; signed in is a
  single avatar menu (My orders, Wishlist, Saved addresses, plus the admin pages for admins).

## 7. Deployment (Vercel)

**HNG rule: turn OFF Vercel Authentication for every project** (Vercel project, Settings, Deployment Protection, Vercel Authentication: off).
While it is on, the `*.vercel.app` links ask visitors, including the reviewers, to log in to Vercel. Check it right after the first deploy of any
new project. It was on for Shopora by default (`all_except_custom_domains`) and was switched off on 2 Oct 2026. Also leave password protection off.

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
