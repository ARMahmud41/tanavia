import Link from 'next/link';

export const metadata = {
  title: 'Terms & Conditions — TANAVIA',
  description:
    'Terms & Conditions for shopping at TANAVIA — return, refund, payment, and shipping policies.',
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
      <div className="text-ink/80 leading-relaxed space-y-3">
        {children}
      </div>
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

export default function TermsPage() {
  return (
    <div className="container-wrap px-4 sm:px-6 py-12 sm:py-16 max-w-4xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-12">
        <p className="text-wine text-xs tracking-[0.3em] uppercase mb-3 font-semibold">
          Legal
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-ink mb-4">
          Terms &amp; Conditions
        </h1>
        <div className="w-16 h-0.5 bg-wine mx-auto" />
      </div>

      {/* Welcome */}
      <div className="prose prose-lg max-w-none text-ink/80 leading-relaxed space-y-5 mb-4">
        <p className="text-lg">
          Welcome to <strong className="text-wine">TANAVIA</strong>. Please read
          these Terms &amp; Conditions carefully before using our website or
          placing an order. By accessing or using any part of our service, you
          confirm that you have read, understood, and agreed to be bound by
          these terms. If you do not agree, please do not use our website or
          services.
        </p>
      </div>

      {/* 1. Introduction */}
      <Section number={1} title="Introduction">
        <p>
          TANAVIA is a Bangladeshi fashion brand offering shoes, bags, apparel,
          and accessories through our online store and physical outlets. These
          Terms govern your use of our website, products, and all related
          services. We may update these Terms at any time without prior notice.
          Changes take effect immediately when posted on this page, and your
          continued use of the site means you accept the updated Terms.
        </p>
      </Section>

      {/* 2. User Account */}
      <Section number={2} title="User Account, Password & Security">
        <p>
          When you register, you receive a unique username and password. You are
          fully responsible for keeping these credentials safe and for all
          activity that occurs under your account.
        </p>
        <List
          items={[
            'Notify TANAVIA immediately if you suspect unauthorized access',
            'Always log out after each session, especially on shared devices',
            'TANAVIA is not liable for losses caused by your failure to protect your account',
          ]}
        />
      </Section>

      {/* 3. Services */}
      <Section number={3} title="Services">
        <p>
          TANAVIA provides a range of online services — browsing, purchasing,
          order tracking, and customer support. Products may be purchased
          through Cash on Delivery, bKash, Nagad, Rocket, or Card. Once you
          place an order, we arrange shipment, and you are responsible for
          paying the agreed price.
        </p>
        <p>
          These services are collectively referred to as{' '}
          <em>&quot;Services&quot;</em> and the items offered as{' '}
          <em>&quot;Products&quot;</em>.
        </p>
      </Section>

      {/* 4. Privacy */}
      <Section number={4} title="Privacy">
        <p>
          By using our services, you acknowledge that you have read and fully
          accepted our Privacy Policy. Your personal information (name, phone,
          address, email) is collected only for order processing, delivery, and
          customer support. We never sell or share your data with third
          parties, except courier partners and payment processors who help us
          complete your order.
        </p>
      </Section>

      {/* 5. User Conduct */}
      <Section number={5} title="User Conduct and Rules">
        <p>
          You agree to use TANAVIA responsibly. While using any of our services,
          you will not:
        </p>
        <List
          items={[
            'Defame, abuse, harass, stalk, threaten, or violate the legal rights of others',
            'Publish, upload, or share inappropriate, obscene, defamatory, or unlawful content',
            'Upload files containing viruses, malware, or software that could damage our systems',
            'Conduct or forward spam, chain letters, pyramid schemes, or fraudulent offers',
            'Falsify authorship, ownership notices, or source labels',
            'Violate any local, national, or international law',
            'Abuse, manipulate, or unethically exploit these Terms or our services',
          ]}
        />
      </Section>

      {/* 6. Discount Policy */}
      <Section number={6} title="Discount Policy">
        <p>
          Only one discount type can be applied per order — free delivery,
          coupon discount, or payment gateway discount.
        </p>
        <List
          items={[
            'If your cart contains a free-delivery product, coupon discounts apply only to the remaining items.',
            'If you pay with a payment gateway that offers its own discount, coupon discounts will not apply.',
          ]}
        />
      </Section>

      {/* 7. Product Description */}
      <Section number={7} title="Product Description">
        <p>
          TANAVIA strives to display every product as accurately as possible —
          colors, sizes, materials, and details. However, slight variations may
          occur due to screen settings and photography. We do not warrant that
          product descriptions or other site content are always accurate,
          complete, or error-free. If an item you receive is significantly
          different from its description, you may return it unused as per our
          Return Policy.
        </p>
      </Section>

      {/* 8. Abusing TANAVIA */}
      <Section number={8} title="Abusing TANAVIA">
        <p>
          Users are solely responsible for the content they upload to our
          website — reviews, comments, images, or any other material. You may be
          held legally liable if your content is defamatory, infringing, or
          violates third-party rights. Please report offensive content, abuse,
          or policy violations to our team. We investigate every report and act
          on verified issues.
        </p>
      </Section>

      {/* 9. Order Acceptance */}
      <Section number={9} title="Order Acceptance and Pricing">
        <p>
          We reserve the right to refuse or cancel any order at any time — for
          reasons including stock unavailability, pricing errors, or suspected
          fraud. We may request additional verification (phone, address, or ID)
          before confirming an order.
        </p>
        <p>
          Prices are subject to change without notice; the price shown at the
          time of order placement applies. All posted prices include applicable
          taxes.
        </p>
      </Section>

      {/* 10. Trademarks */}
      <Section number={10} title="Trademarks and Copyrights">
        <p>
          All content on this website — logos, product images, text, layout,
          source code, and design — belongs to TANAVIA and is protected by
          copyright and trademark law. You may not copy, reproduce, distribute,
          or use any content without written permission.
        </p>
        <p>
          Any content you upload (reviews, photos, comments) remains yours, but
          by posting it publicly, you grant TANAVIA a non-exclusive,
          royalty-free license to display, share, and use it on our platform.
        </p>
      </Section>

      {/* 11. Return & Replacement */}
      <Section number={11} title="Return & Replacement Policy">
        <p>
          We want you to love your purchase. If something goes wrong, you may
          return an item within <strong>7 days of delivery</strong>, provided:
        </p>
        <List
          items={[
            'The item is unused and in original condition with tags and packaging intact',
            'Free promotional items (if any) are returned together',
            'The item was damaged, defective, wrong, or not as described',
          ]}
        />

        <p className="font-semibold text-ink mt-4">Reasons accepted for return:</p>
        <List
          items={[
            'Damaged, defective, or wrong product shipped',
            'Size mismatch for clothing',
            'Color mismatch from what was ordered',
          ]}
        />

        <p className="font-semibold text-ink mt-4">How to return:</p>
        <List
          items={[
            'Contact our Customer Care team via WhatsApp or email within 7 days of receiving your order.',
            'Once we receive and inspect the item, we will replace it or issue a refund as applicable.',
            'Replacement is subject to stock availability. If out of stock, a full refund will be issued.',
          ]}
        />

        <p className="text-sm text-muted italic mt-3">
          Note: Delivery and COD convenience charges are non-refundable.
        </p>
      </Section>

      {/* 12. Refund Policy */}
      <Section number={12} title="Refund Policy">
        <p>
          Refunds are processed after we complete inspection of the returned
          item.
        </p>
        <List
          items={[
            'If you chose Cash on Delivery (COD), there is no refund as no advance payment was made.',
            'For bKash, Nagad, Rocket, Card, or Bank Transfer payments, refunds are issued to the original payment method.',
            'Refunds are typically completed within 7-10 business days.',
            'Delivery and COD charges are non-refundable.',
          ]}
        />
      </Section>

      {/* 13. Order Cancellation */}
      <Section number={13} title="Order Cancellation">
        <p>
          After you place an order, we will send a confirmation (via WhatsApp,
          SMS, or call). You may cancel your order before shipment by contacting
          us directly. Once shipped, cancellation is no longer possible — you
          may use our Return Policy instead.
        </p>
        <List
          items={[
            'For COD orders, no refund applies (nothing was paid).',
            'For prepaid orders, the full amount is refunded to your original payment method after cancellation.',
          ]}
        />
      </Section>

      {/* 14. Unauthorized Charges */}
      <Section number={14} title="Unauthorized Charges on Card">
        <p>
          If you notice charges on your card for a TANAVIA order you did not
          place, first check with family members or colleagues who may have used
          your card. If you still do not recognize the charge, report it within{' '}
          <strong>60 days</strong> so we can begin an investigation. TANAVIA
          takes every report seriously and will assist with your bank or payment
          provider.
        </p>
      </Section>

      {/* 15. Fraudulent Order Cancellation */}
      <Section number={15} title="Fraudulent Order Cancellation">
        <p>
          To provide a safe shopping experience, we continuously monitor
          transactions for suspicious activity. We reserve the right to cancel
          any past, pending, or future order if fraud is suspected — without any
          liability.
        </p>
        <p className="font-semibold text-ink mt-4">
          A customer may be considered fraudulent if:
        </p>
        <List
          items={[
            'They do not respond to payment verification requests',
            'They provide false, insufficient, or forged information',
            "They misuse another person's phone, email, or card",
            'They refuse to pay for a delivered order',
            'They return a different product than what was shipped',
          ]}
        />
        <p>
          If an order is cancelled after a card has been charged, the amount is
          refunded to the original payment method. Promotional vouchers used on
          cancelled orders may not be refundable.
        </p>
      </Section>

      {/* 16. Payment & Shipping */}
      <Section number={16} title="Payment & Shipping">
        <p>
          We accept <strong>Cash on Delivery (COD)</strong>,{' '}
          <strong>bKash</strong>, <strong>Nagad</strong>,{' '}
          <strong>Rocket</strong>, and <strong>Card</strong> payments.
        </p>
        <List
          items={[
            'We arrange shipment to your provided address.',
            'Delivery timelines are estimates — actual times may vary due to weather, courier delays, or other factors beyond our control.',
            'Risk of loss or damage passes to you once the item is delivered. Report any transit damage within 24 hours with photo evidence.',
            'Title and ownership of goods pass to you upon delivery.',
          ]}
        />
      </Section>

      {/* 17. Fraud Protection */}
      <Section number={17} title="Fraud Protection Policy">
        <p>
          TANAVIA takes fraud protection seriously. We and our payment partners
          continuously monitor transactions for suspicious activity. In rare
          cases, we may place a transaction on hold and request identification
          to verify the purchase. This protects both you and TANAVIA. We
          apologize for any inconvenience and appreciate your patience in
          helping us keep our platform secure.
        </p>
      </Section>

      {/* 18. Term and Policy Updates */}
      <Section number={18} title="Term and Policy Updates">
        <p>
          We reserve the right to change or update these Terms and policies at
          any time by posting a notice on our site. Such changes are effective
          immediately upon posting. It is your responsibility to review these
          Terms periodically. Your continued use of the website after changes
          are posted constitutes acceptance of the updated Terms.
        </p>
      </Section>

      {/* Last updated */}
      <div className="mt-12 p-5 bg-sand rounded-lg border border-line text-sm text-muted">
        <strong className="text-ink">Last updated:</strong> October 2026
        <br />
        Questions? Contact us at{' '}
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