# Shopora phone app

An Expo (React Native) app for the Shopora shop. It talks to **exactly the same API and database as the website**
(`https://www.shopora.website`), so a login works on both and the cart is shared: add something on the web and it shows up
in the app within a couple of seconds, and the other way round.

```bash
cd mobile
npm install
npx expo start          # scan the QR code with Expo Go on your phone
```

- API address: `EXPO_PUBLIC_API_URL` (defaults to `https://www.shopora.website`).
- Login: `POST /api/auth/login` with the header `x-shopora-client: mobile` also returns a `token`; the app keeps it in
  the phone's secure storage and sends `Authorization: Bearer <token>`.
- Cart: `GET/POST/PATCH/DELETE /api/cart…`, re-read every 2 seconds while the app is open.
- Paying opens Paystack's page in the in-app browser; the order screen then refreshes itself.
- Checks: `npx tsc --noEmit`. Bundle check: `npx expo export --platform android`.
