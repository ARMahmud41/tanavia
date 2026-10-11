import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — TANAVIA',
  description:
    'How TANAVIA collects, uses, and protects your personal information.',
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

export default function PrivacyPage() {
  return (
    <div className="container-wrap px-4 sm:px-6 py-12 sm:py-16 max-w-4xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-12">
        <p className="text-wine text-xs tracking-[0.3em] uppercase mb-3 font-semibold">
          Legal
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-ink mb-4">
          Privacy Policy
        </h1>
        <div className="w-16 h-0.5 bg-wine mx-auto" />
      </div>

      {/* Welcome */}
      <div className="prose prose-lg max-w-none text-ink/80 leading-relaxed space-y-5 mb-4">
        <p className="text-lg">
          At <strong className="text-wine">TANAVIA</strong>, we respect your
          privacy and value the trust you place in us. This Privacy Policy
          explains what information we collect, how we use it, and how we keep
          it safe when you shop with us or interact with our website.
        </p>
        <p>
          By accessing or using our services, you agree to the collection and
          use of your information as described in this Policy. If you do not
          agree, please do not use our website.
        </p>
      </div>

      {/* 1. Introduction */}
      <Section number={1} title="Introduction">
        <p>
          TANAVIA is a Bangladeshi fashion brand offering shoes, bags, apparel,
          and accessories. This Privacy Policy applies to our website, mobile
          experience, and all related services. We may update this Policy at any
          time without prior notice — changes take effect immediately when
          posted. Please review this page regularly.
        </p>
      </Section>

      {/* 2. Information We Collect */}
      <Section number={2} title="Information We Collect">
        <p>
          When you interact with TANAVIA, we may collect the following
          information:
        </p>
        <p className="font-semibold text-ink mt-4">
          Personal information you provide:
        </p>
        <List
          items={[
            'Full name (first and last name)',
            'Mobile phone number and email address',
            'Delivery address, including district and postal code',
            'Payment information (bKash/Nagad transaction IDs, card details handled by secure gateways)',
            'Order notes and customer support conversations',
          ]}
        />
        <p className="font-semibold text-ink mt-4">
          Information we collect automatically:
        </p>
        <List
          items={[
            'IP address and browser type',
            'Pages you visit and products you view',
            'Time spent on the site and links you click',
            'Device type and operating system',
            'Cookies and similar tracking technologies',
          ]}
        />
      </Section>

      {/* 3. How We Collect Information */}
      <Section number={3} title="How We Collect Information">
        <p>
          We collect information from you in the following ways:
        </p>
        <List
          items={[
            'When you register an account or place an order',
            'When you subscribe to our newsletter or promotions',
            'When you contact us via WhatsApp, phone, or email',
            'When you participate in surveys, contests, or feedback forms',
            'Automatically through cookies when you browse our site',
          ]}
        />
        <p>
          We only collect personal information from you through voluntary
          actions — we never secretly gather sensitive data.
        </p>
      </Section>

      {/* 4. How We Use Your Information */}
      <Section number={4} title="How We Use Your Information">
        <p>
          We use your information to deliver the best possible shopping
          experience. Specifically, we use it to:
        </p>
        <List
          items={[
            'Process and deliver your orders accurately',
            'Communicate order updates via SMS, email, or WhatsApp',
            'Provide customer support and resolve issues',
            'Personalize product recommendations and offers',
            'Improve our website, products, and services',
            'Send promotional messages (only if you opt-in)',
            'Detect and prevent fraud, abuse, or security risks',
            'Comply with legal requirements in Bangladesh',
          ]}
        />
      </Section>

      {/* 5. Sharing Your Information */}
      <Section number={5} title="Sharing Your Information">
        <p>
          <strong>We never sell or rent your personal information.</strong> We
          only share it in the following limited cases:
        </p>
        <List
          items={[
            'With courier partners (Pathao, Steadfast, RedX, etc.) to deliver your orders',
            'With payment processors (bKash, Nagad, Rocket, card gateways) to complete transactions',
            'With legal authorities when required by Bangladeshi law, court order, or valid request',
            'To investigate fraud, prevent illegal activity, or protect user safety',
            'With your explicit consent for any other purpose',
          ]}
        />
        <p>
          Any third-party partner we work with is contractually required to
          protect your data and use it only for the agreed purpose.
        </p>
      </Section>

      {/* 6. Your Choices & Control */}
      <Section number={6} title="Your Choices & Control">
        <p>
          You are always in control of your data. You may:
        </p>
        <List
          items={[
            'Update your account information at any time from your account page',
            'Opt-in or opt-out of promotional emails and SMS',
            'Request deletion of your account and data by emailing us',
            'Change your cookie preferences in your browser settings',
          ]}
        />
        <p>
          Note: Even if you delete your account, some information may remain in
          our archive for legal, tax, and fraud-prevention purposes, as required
          by law.
        </p>
      </Section>

      {/* 7. Data Security */}
      <Section number={7} title="Data Security">
        <p>
          We take the security of your data seriously. We use industry-standard
          technical, physical, and administrative safeguards to protect it:
        </p>
        <List
          items={[
            'All website traffic is encrypted with HTTPS/SSL',
            'Passwords are hashed with modern algorithms (never stored in plain text)',
            'Only authorized staff can access customer data, on a need-to-know basis',
            'Payment information is handled by PCI-compliant gateways — never stored on our servers',
          ]}
        />
        <p>
          While we work hard to protect your data, no method of transmission
          over the internet is 100% secure. By using our site, you acknowledge
          this inherent risk.
        </p>
      </Section>

      {/* 8. Your Rights */}
      <Section number={8} title="Your Rights">
        <p>
          As a TANAVIA customer, you have the right to:
        </p>
        <List
          items={[
            'Access the personal data we hold about you',
            'Request corrections to any inaccurate information',
            'Ask us to stop using your data for marketing',
            'Request full deletion of your personal data across all platforms',
            'File a complaint if you believe your data has been misused',
          ]}
        />
        <p>
          To exercise any of these rights, email us at{' '}
          <a
            href="mailto:hello@tanavia.com"
            className="text-wine font-semibold hover:underline"
          >
            hello@tanavia.com
          </a>
          . We will process your request within one business day and confirm the
          update.
        </p>
      </Section>

      {/* 9. Cookies & Tracking */}
      <Section number={9} title="Cookies & Tracking">
        <p>
          Our website uses cookies and similar technologies to remember your
          preferences, keep your cart contents, and understand how visitors use
          our site. Cookies are small text files stored on your device.
        </p>
        <p>
          You can disable cookies in your browser settings at any time, but some
          parts of our website may not work properly without them.
        </p>
      </Section>

      {/* 10. Children's Privacy */}
      <Section number={10} title="Children's Privacy">
        <p>
          TANAVIA is not intended for children under 13 years old. We do not
          knowingly collect personal information from children. If you believe a
          child has provided us with personal data, please contact us
          immediately and we will delete it.
        </p>
      </Section>

      {/* 11. Policy Updates */}
      <Section number={11} title="Policy Updates">
        <p>
          We may update this Privacy Policy from time to time to reflect changes
          in our practices or legal requirements. Any updates will be posted on
          this page with a new effective date. Continued use of our services
          after changes are posted means you accept the updated Policy.
        </p>
      </Section>

      {/* Last updated */}
      <div className="mt-12 p-5 bg-sand rounded-lg border border-line text-sm text-muted">
        <strong className="text-ink">Last updated:</strong> October 2026
        <br />
        Questions about your privacy? Contact us at{' '}
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