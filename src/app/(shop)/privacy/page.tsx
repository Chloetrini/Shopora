import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE } from '@/constants/site'

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: `How ${SITE.name} collects, uses and protects your information.`,
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-8 leading-relaxed [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
      <header>
        <h1 className="font-display text-3xl font-semibold">Privacy policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {SITE.legalUpdated}</p>
        <p className="mt-4">
          {SITE.name} is a small online shop with a website and a phone app. This page explains what information we collect, why, who
          else handles it, and the choices you have. We keep it short and plain on purpose.
        </p>
      </header>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li><strong>Account details:</strong> your name, email address and a username or password. Passwords are stored only as a one-way hash, never in readable form. If you sign up with Google we receive your name, email address and Google account ID, and nothing else (no contacts, files or other Google data).</li>
          <li><strong>Profile details you choose to add:</strong> a profile photo and a phone number.</li>
          <li><strong>Orders:</strong> the items you buy, the name, email and delivery address you give us, and the status of the order.</li>
          <li><strong>Your cart, wishlist, saved addresses and reviews</strong>, so they stay with your account on the website and in the app.</li>
          <li><strong>Technical data:</strong> a login cookie (or token in the app) that keeps you signed in, and your light or dark theme choice, stored on your device. Our hosting provider also keeps standard server logs, such as IP address and time of request, for security and troubleshooting.</li>
        </ul>
      </section>

      <section>
        <h2>How we use it</h2>
        <ul>
          <li>To create and secure your account and keep you signed in.</li>
          <li>To take, pay for, deliver and track your orders, and to email you a confirmation and updates about them.</li>
          <li>To send account emails: confirming your email address, resetting a password, and a welcome message.</li>
          <li>To prevent abuse, for example by limiting repeated sign-in attempts.</li>
        </ul>
        <p className="mt-3">We do not sell your information, and we do not use it for advertising.</p>
      </section>

      <section>
        <h2>Who else handles it</h2>
        <p>We use a small number of services to run the shop. Each receives only what it needs:</p>
        <ul>
          <li><strong>Paystack</strong> processes card payments. You type your card details on Paystack&rsquo;s own page. They never reach our servers. We only learn whether the payment succeeded.</li>
          <li><strong>Google</strong>, if you choose &ldquo;Continue with Google&rdquo;, confirms who you are.</li>
          <li><strong>Mailgun</strong> delivers our emails to you.</li>
          <li><strong>Neon</strong> stores our database, and <strong>Vercel</strong> hosts the website.</li>
        </ul>
        <p className="mt-3">We may also share information if the law requires it.</p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>We keep your account information while your account exists. Order records are kept so we can support and track your orders. When you delete your account from your profile page, your account details, cart, wishlist, saved addresses and profile photo are removed.</p>
      </section>

      <section>
        <h2>Your choices</h2>
        <ul>
          <li>You can see and edit your details on your profile page, and add or remove your photo.</li>
          <li>You can delete your account at any time from your profile page.</li>
          <li>You can ask us to correct or delete information, or ask what we hold about you, by emailing us at the address below.</li>
        </ul>
      </section>

      <section>
        <h2>Security</h2>
        <p>Connections to the site use HTTPS. Passwords are hashed, emailed links are single-use and expire, and each person can only see their own account and orders. No system is perfectly secure, but we work to protect your information.</p>
      </section>

      <section>
        <h2>Test mode</h2>
        <p>Payments on {SITE.name} are currently in test mode, so no real money is charged. Please do not use real card details.</p>
      </section>

      <section>
        <h2>Children</h2>
        <p>{SITE.name} is not meant for children under 13, and we do not knowingly collect their information.</p>
      </section>

      <section>
        <h2>Changes and contact</h2>
        <p>If we change this policy, we will update the date at the top of this page. Questions about your information? Email <a className="underline" href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>. See also our <Link className="underline" href="/terms">terms of service</Link>.</p>
      </section>
    </article>
  )
}
