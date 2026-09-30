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
Apply `db/003_paystack.sql` after the first two SQL files.
