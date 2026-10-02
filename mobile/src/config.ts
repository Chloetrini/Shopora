/** The shop's API. The phone app talks to exactly the same endpoints as the website. */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://www.shopora.website').replace(/\/$/, '')

/** How often the cart and an open order are re-read from the server (the web does the same). */
export const CART_POLL_MS = 2000
export const ORDER_POLL_MS = 5000
