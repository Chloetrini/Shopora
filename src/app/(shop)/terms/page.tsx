import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE } from '@/constants/site'

export const metadata: Metadata = {
  title: 'Terms of service',
  description: `The terms for using ${SITE.name}.`,
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-8 leading-relaxed [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
      <header>
        <h1 className="font-display text-3xl font-semibold">Terms of service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {SITE.legalUpdated}</p>
        <p className="mt-4">
          By using {SITE.name}, on the website or in the phone app, you agree to these terms. If you do not agree, please do not use it.
        </p>
      </header>

      <section>
        <h2>Using the shop</h2>
        <ul>
          <li>You can browse and buy as a guest, or create an account. Give accurate details, and keep your password private. You are responsible for what happens under your account.</li>
          <li>You must be old enough to form a contract where you live, or have a parent or guardian&rsquo;s permission.</li>
          <li>Do not misuse the service: no attempts to break, overload or get into other people&rsquo;s accounts, and no unlawful or abusive content in reviews.</li>
        </ul>
      </section>

      <section>
        <h2>Orders and prices</h2>
        <ul>
          <li>Prices are shown in the currency on the page. Delivery fees are shown before you pay.</li>
          <li>An order is confirmed once your payment is verified. We email you a confirmation, then updates as it ships.</li>
          <li>We may cancel an order, for example if an item is unavailable or a price was shown in error. If you already paid, we will arrange a refund.</li>
          <li>Discount codes follow their own conditions, such as an expiry date or a limited number of uses.</li>
        </ul>
      </section>

      <section>
        <h2>Payments</h2>
        <p>Card payments are handled by Paystack. {SITE.name} is currently in <strong>test mode</strong>: no real money is charged, and you should use test card details only.</p>
      </section>

      <section>
        <h2>Your account</h2>
        <p>You can delete your account at any time from your profile page. We may suspend or remove accounts that break these terms. How we handle your information is described in our <Link className="underline" href="/privacy">privacy policy</Link>.</p>
      </section>

      <section>
        <h2>Our content</h2>
        <p>The shop&rsquo;s design, text and software belong to {SITE.name} or its owners. Product names and images belong to their owners. You may use the site for your own shopping, but not copy or resell it.</p>
      </section>

      <section>
        <h2>Availability and liability</h2>
        <p>We try to keep {SITE.name} running and accurate, but it is provided &ldquo;as is&rdquo;, without promises that it will always be available or error-free. To the extent the law allows, we are not liable for indirect losses arising from using the site. Nothing here limits rights you have by law.</p>
      </section>

      <section>
        <h2>Changes and contact</h2>
        <p>We may update these terms, and will change the date above when we do. Continuing to use {SITE.name} after a change means you accept it. Questions? Email <a className="underline" href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.</p>
      </section>
    </article>
  )
}
