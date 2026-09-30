# AGENTS.md — Shopora

Loaded at the start of every AI session. Source of truth for what Shopora is and how it is built.
Build **one milestone at a time** (Section 6): finish it, run the checks (Section 3), stop for review.
At the end of each session ask: "Is there anything from this session that should be added here?"

## 1. Product

Shopora is a small online shop (HNG15 Lesson 2 individual task): browse products, add to a cart,
check out, persist everything in a database, email an order confirmation, sign in with Google.
The product name lives in one place, `src/constants/site.ts`.

**Payment decision:** checkout saves the order and emails a confirmation. **No real payment is taken.**
Stripe (test mode) is an optional later milestone. Never label the UI as if money moved.

Pages (planned): `/` catalogue, `/products/[slug]`, `/cart`, `/checkout`, `/orders/[id]` (confirmation),
`/orders` (my orders), `/login`, `/register`.

## 2. Stack

Next.js 16 (App Router), TypeScript strict (~5.9), React 19, Tailwind v4, zod v4, Vitest,
**Neon Postgres** via `@neondatabase/serverless`, **Mailgun** (HTTP API over `fetch`, no SDK),
Google OAuth (authorization code + PKCE, no auth library), hosting on Vercel. Same conventions as the
sibling project Taskora (thin `page.tsx`, server code under `src/server`, `@/` imports, kebab-case files).

## 3. Commands and definition of done

```bash
npm run dev · npm run typecheck · npm run lint · npm test · npm run build
```
Done only when typecheck, lint, test and build all pass. Check UI at ~400px and desktop, light and dark.

## 4. Data (Neon project `shopora`, id `cool-voice-24183935`)

SQL lives in `db/` and is applied in order: `001_schema.sql`, `002_seed_products.sql`.
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

## 6. Milestones

### ✅ Milestone 1: Foundation
Next.js + Tailwind + Vitest scaffold, Neon schema and seed, catalogue on `/`.
### ⬜ Milestone 2: Cart and checkout
Cart (client, persisted in localStorage), checkout form, `POST /api/orders` (transaction, server-side totals), confirmation page.
### ⬜ Milestone 3: Confirmation emails
Mailgun `sendEmail()`, order confirmation template (HTML-escaped), tests with stubbed `fetch`.
### ⬜ Milestone 4: Accounts and Google sign-in
Register/login, Google OAuth (Section 5 rules), my orders page.
### ⬜ Milestone 5: Ship
Vercel deploy, env vars, Google redirect URIs, health check, README.
### ⬜ Optional: Stripe test-mode payments
