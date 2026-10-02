# Shopora: submission notes

HNG15 Internship, Lesson 2 (shop website) and Lesson 3 (mobile app).

## Links

| What | Where |
|---|---|
| Live website | https://www.shopora.website |
| Code (website and app) | https://github.com/Chloetrini/Shopora, branch `chloe/milestone-1-foundation` (the default branch) (the website lives in the repo root, the phone app in `mobile/`) |
| Phone app (Expo Go) | https://expo.dev/accounts/chloetrini/projects/shopora (open the latest update and tap "Open in Expo Go") |
| Installable Android app | the `.apk` from the latest "preview" build on the same Expo project page, under Builds |
| Spec and rules | `AGENTS.md` in the repo |

## What it is

Shopora is a small online shop. The same API and the same Neon Postgres database serve a Next.js website and an Expo (React Native) phone app,
so an account, a cart and an order are the same everywhere.

## Lesson 2 checklist (website)

| Requirement | Done | How |
|---|---|---|
| Shop website with a checkout page | Yes | Catalogue, product pages, cart, checkout with delivery fee by location and discount codes |
| Everything saved in a database | Yes | Neon Postgres: users, products, orders, order items, carts, addresses, reviews, wishlists, discount codes, delivery zones |
| Confirmation emails with Mailgun | Yes | Own domain `mg.shopora.website`; order confirmation, shipping updates, welcome and confirm-your-email, password reset |
| Google authentication | Yes | Google Cloud Console OAuth client (PKCE + state); first sign-in creates the account, a verified email links to an existing one |
| Own repository | Yes | Chloetrini/Shopora |
| Deployed | Yes | Vercel, custom domain shopora.website (Vercel Authentication turned off) |

Extras: Paystack payments in test mode, order tracking for guests and members, admin tools (orders, products, discounts, delivery fees),
wishlist, reviews, saved addresses, back-in-stock alerts, profile with photo, forgot/reset password, product photos stored in the database.

## Lesson 3 checklist (mobile app)

| Requirement | Done | How |
|---|---|---|
| A mobile app of the shop website | Yes | Expo / React Native app in `mobile/` |
| Uses the same API endpoints | Yes | Same `/api/...` routes; the only addition is a login token for the app, sent as `Authorization: Bearer ...` |
| A user logs in on both | Yes | Same account on web and phone; email and password, or Continue with Google (secure browser sheet + one-time code) |
| Adding to the cart on the web shows instantly on mobile | Yes | The cart lives on the server, tied to the account; each client re-reads it every 2 seconds and whenever it is opened |
| Tested on a phone | Yes | Expo Go on an iPhone, and an installable Android build |

## How the cart stays in sync

1. Signed in, the cart is stored in the `cart_items` table by user id, never in the browser or phone.
2. Every change is sent to the server, which answers with the whole cart; the screen updates first and is then replaced by the server's copy.
3. The website and the app poll `GET /api/cart` every 2 seconds while visible and refresh when they regain focus, so a change on one appears on the other within a couple of seconds.
4. A guest's browser cart is merged into the account cart at sign-in.

## Security notes

- Tenant isolation: the user id only comes from the session (cookie or token), every user-owned query is scoped by it, and other people's data answers 404.
- Email and password sign-ups must confirm their email before they can log in; Google sign-ups are already verified and log in at once.
- Passwords hashed with bcrypt; emailed links (confirm email, reset password) are 256-bit random, stored only as a hash, single use and expiring; reset and "forgot password" answer the same for known and unknown emails.
- The app's Google sign-in returns a one-time code bound to a secret PKCE verifier kept on the phone, never the session itself.
- Admin routes answer 404 to everyone who is not an admin.
- Money is handled in whole kobo; prices are always read on the server at checkout, and payments are verified with Paystack (amount and currency) before an order is confirmed.

## Tests and checks

175 automated tests (`npm test`), plus typecheck, lint and a production build. Database changes were checked against the real Neon database with
rollback-only tests.

## Hardest parts (for the form)

- Getting Mailgun to send reliably: the sandbox only mails authorised recipients, so a custom domain and its DNS records were needed.
- Sharing one cart between a website that uses cookies and a phone app that uses tokens, without ever trusting the client for prices or identity.
- Signing in with Google from inside a phone app safely (the code-plus-verifier hand-off instead of returning a session in a link).
