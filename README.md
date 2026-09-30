# Shopora

A small online shop: browse products, check out, get a confirmation email, sign in with Google.
Built for HNG15 Lesson 2. See `AGENTS.md` for the spec and milestones.

```bash
cp .env.example .env.local   # fill in DATABASE_URL at least
npm install
npm run dev                  # http://localhost:3000
```

Database: Neon Postgres. Apply `db/001_schema.sql`, then `db/002_seed_products.sql`.
