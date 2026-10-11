import Link from 'next/link';

export const metadata = {
  title: 'Cancellation & Return Policy — TANAVIA',
  description:
    'TANAVIA cancellation, return, replacement, and refund policy — 7-day easy return with no questions asked.',
};

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-10 first:mt-0">
      <h2 className="font-serif text-2xl font-semibold text-wine mb-3">
        {number}. {title}
      </h2>
      <div className="text-ink/80 leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 list-none pl-0">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="text-wine font-bold flex-shrink-0">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 list-none pl-0">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="text-emerald-600 font-bold flex-shrink-0">✓</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function CrossList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 list-none pl-0">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="text-red-500 font-bold flex-shrink-0">✗</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ReturnRefundPage() {
  return (
    <div className="container-wrap px-4 sm:px-6 py-12 sm:py-16 max-w-4xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-12">
        <p className="text-wine text-xs tracking-[0.3em] uppercase mb-3 font-semibold">
          Customer Care
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-ink mb-4">
          Cancellation & Return
        </h1>
        <div className="w-16 h-0.5 bg-wine mx-auto" />
      </div>

      {/* Welcome */}
      <div className="prose prose-lg max-w-none text-ink/80 leading-relaxed space-y-5 mb-4">
        <p className="text-lg">
          We want you to love your purchase from{' '}
          <strong className="text-wine">TANAVIA</strong>. If something isn&apos;t
          right, our simple policy makes it easy to cancel, return, or exchange.
        </p>
        <p>
          Below you&apos;ll find everything about cancellations, returns,
          replacements, and refunds — written in plain language, no fine print.
        </p>
      </div>

      {/* Quick Summary Card */}
      <div className="mt-8 p-5 sm:p-6 bg-sand rounded-lg border border-line">
        <h3 className="font-serif text-lg font-semibold text-wine mb-3">
          ⚡ Quick Summary
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-wine font-bold flex-shrink-0">📅</span>
            <span>
              <strong>7-day return</strong> window from delivery date
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-wine font-bold flex-shrink-0">💰</span>
            <span>
              <strong>100% refund</strong> if item is out of stock
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-wine font-bold flex-shrink-0">🚚</span>
            <span>
              <strong>Free replacement</strong> for damaged items
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-wine font-bold flex-shrink-0">⏱️</span>
            <span>
              Refunds within <strong>7-10 business days</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 1. Order Cancellation */}
      <Section number={1} title="Order Cancellation">
        <p>
          You can cancel your order at any stage <strong>before shipment</strong>
          . After you place an order, our team will send a confirmation via
          WhatsApp, SMS, or call. This is your chance to make changes or cancel.
        </p>

        <p className="font-semibold text-ink mt-4">
          How to cancel:
        </p>
        <List
          items={[
            'Reply to our confirmation message on WhatsApp',
            'Call our customer care at +880 9612-345678',
            'Email us at hello@tanavia.com with your order number',
          ]}
        />

        <p className="font-semibold text-ink mt-4">
          Once the order is shipped:
        </p>
        <p>
          Cancellation is no longer possible — but you can still use our{' '}
          <strong>7-day Return Policy</strong> after receiving the item.
        </p>
      </Section>

      {/* 2. Return Window & Eligibility */}
      <Section number={2} title="Return Window & Eligibility">
        <p>
          You may return an item within <strong>7 days</strong> from the date of
          delivery. To be eligible, the item must meet the following criteria:
        </p>
        <CheckList
          items={[
            'Unused and in original condition',
            'All original tags, labels, and packaging intact',
            'Free promotional items (if any) returned together',
            'Original invoice or order confirmation included',
          ]}
        />
      </Section>

      {/* 3. Reasons We Accept Returns */}
      <Section number={3} title="Reasons We Accept Returns">
        <p>
          We accept returns for the following reasons:
        </p>
        <CheckList
          items={[
            'Product is damaged, defective, or broken',
            'Product is significantly different from the description',
            'Wrong product was shipped',
            'Size mismatch (for clothing and footwear)',
            'Color mismatch from what was ordered',
          ]}
        />
      </Section>

      {/* 4. What We Cannot Accept */}
      <Section number={4} title="What We Cannot Accept">
        <p>
          To keep returns fair for everyone, we cannot accept returns in the
          following cases:
        </p>
        <CrossList
          items={[
            'Items returned after 7 days of delivery',
            'Used, washed, altered, or damaged items (damage caused by customer)',
            'Items without original tags, labels, or packaging',
            'Innerwear, cosmetics, and personal care items (for hygiene reasons)',
            'Items purchased during final sale or clearance (marked non-returnable)',
            'Free gifts or promotional items returned without the main product',
          ]}
        />
      </Section>

      {/* 5. How to Return an Item */}
      <Section number={5} title="How to Return an Item">
        <p>
          Returning an item is simple. Just follow these four steps:
        </p>

        <div className="space-y-4 mt-4">
          <div className="flex gap-4 p-4 bg-white border border-line rounded-lg">
            <div className="w-8 h-8 rounded-full bg-wine text-white flex items-center justify-center font-semibold flex-shrink-0">
              1
            </div>
            <div>
              <p className="font-semibold text-ink">Contact us</p>
              <p className="text-sm text-muted">
                Within 7 days of delivery, message us on WhatsApp or email
                hello@tanavia.com with your order number and photos of the issue.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-4 bg-white border border-line rounded-lg">
            <div className="w-8 h-8 rounded-full bg-wine text-white flex items-center justify-center font-semibold flex-shrink-0">
              2
            </div>
            <div>
              <p className="font-semibold text-ink">Get approval</p>
              <p className="text-sm text-muted">
                Our team will review your request within 24 hours and confirm
                return eligibility.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-4 bg-white border border-line rounded-lg">
            <div className="w-8 h-8 rounded-full bg-wine text-white flex items-center justify-center font-semibold flex-shrink-0">
              3
            </div>
            <div>
              <p className="font-semibold text-ink">Send the item back</p>
              <p className="text-sm text-muted">
                We will arrange a pickup or share a return address. Pack the item
                securely in its original packaging.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-4 bg-white border border-line rounded-lg">
            <div className="w-8 h-8 rounded-full bg-wine text-white flex items-center justify-center font-semibold flex-shrink-0">
              4
            </div>
            <div>
              <p className="font-semibold text-ink">Get your refund or replacement</p>
              <p className="text-sm text-muted">
                After inspection, we&apos;ll process your refund or ship the
                replacement — whichever you prefer.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* 6. Replacement Policy */}
      <Section number={6} title="Replacement Policy">
        <p>
          For damaged, defective, or wrong items, we offer{' '}
          <strong>free replacement</strong> as the fastest solution.
        </p>
        <List
          items={[
            'Replacement is subject to stock availability.',
            'If the item is out of stock, we will issue a 100% refund instead.',
            'We cover all shipping costs for replacements caused by our error.',
            'For size or color swaps, additional shipping charges may apply.',
          ]}
        />
      </Section>

      {/* 7. Refund Policy */}
      <Section number={7} title="Refund Policy">
        <p>
          Refunds are processed after we complete inspection of the returned
          item. Here&apos;s how refunds work depending on your payment method:
        </p>

        <div className="mt-4 space-y-3">
          <div className="p-4 bg-white border border-line rounded-lg">
            <p className="font-semibold text-ink mb-1">
              💵 Cash on Delivery (COD)
            </p>
            <p className="text-sm text-muted">
              No refund applies — you did not pay anything in advance.
            </p>
          </div>

          <div className="p-4 bg-white border border-line rounded-lg">
            <p className="font-semibold text-ink mb-1">
              📱 bKash / Nagad / Rocket
            </p>
            <p className="text-sm text-muted">
              Refunded to your original mobile wallet within 7-10 business days.
            </p>
          </div>

          <div className="p-4 bg-white border border-line rounded-lg">
            <p className="font-semibold text-ink mb-1">💳 Card / Bank Transfer</p>
            <p className="text-sm text-muted">
              Refunded to the same card or bank account within 7-10 business
              days.
            </p>
          </div>
        </div>

        <p className="text-sm text-muted italic mt-4">
          Note: Delivery charges and COD convenience fees are non-refundable.
        </p>
      </Section>

      {/* 8. Refund Timeline */}
      <Section number={8} title="Refund Timeline">
        <p>
          Here&apos;s what to expect after we receive your return:
        </p>
        <List
          items={[
            'Day 1-2: Item received and inspected by our team',
            'Day 3: Refund approved and initiated',
            'Day 7-10: Amount credited to your original payment method',
          ]}
        />
        <p>
          If you don&apos;t receive your refund within 10 business days, contact
          us immediately at{' '}
          <a
            href="mailto:hello@tanavia.com"
            className="text-wine font-semibold hover:underline"
          >
            hello@tanavia.com
          </a>{' '}
          and we&apos;ll investigate.
        </p>
      </Section>

      {/* 9. Damaged or Defective Items */}
      <Section number={9} title="Damaged or Defective Items">
        <p>
          If you receive a damaged or defective item, please report it within{' '}
          <strong>24 hours</strong> of delivery with photo or video evidence.
        </p>
        <List
          items={[
            'Send clear photos of the damage and the packaging',
            'Include your order number in the message',
            'We will arrange a free pickup and replacement',
            'If replacement is not possible, we issue a full refund',
          ]}
        />
      </Section>

      {/* 10. Contact Us */}
      <Section number={10} title="Contact Us">
        <p>
          Have a question about returns or cancellations? Our customer care team
          is here to help — every day from 10 AM to 8 PM.
        </p>
        <List
          items={[
            'WhatsApp: +880 9612-345678',
            'Email: hello@tanavia.com',
            'Facebook: facebook.com/tanavia',
          ]}
        />
      </Section>

      {/* Last updated */}
      <div className="mt-12 p-5 bg-sand rounded-lg border border-line text-sm text-muted">
        <strong className="text-ink">Last updated:</strong> October 2026
        <br />
        Need help with a return? Contact us at{' '}
        <a
          href="mailto:hello@tanavia.com"
          className="text-wine font-semibold hover:underline"
        >
          hello@tanavia.com
        </a>{' '}
        or WhatsApp{' '}
        <a
          href="https://wa.me/8809612345678"
          target="_blank"
          rel="noreferrer"
          className="text-wine font-semibold hover:underline"
        >
          +880 9612-345678
        </a>
        .
      </div>

      {/* CTA */}
      <div className="text-center mt-12">
        <h3 className="font-serif text-2xl font-semibold text-ink mb-4">
          Ready to shop?
        </h3>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 btn text-sm sm:text-base"
        >
          Shop the Collection
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}