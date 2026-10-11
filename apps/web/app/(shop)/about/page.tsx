import Link from 'next/link';

export const metadata = {
  title: 'About TANAVIA — Fashion, Lifestyle, You',
  description:
    'TANAVIA is a Bangladeshi fashion brand offering premium quality shoes, bags and apparel with fast delivery across Bangladesh.',
};

export default function AboutPage() {
  return (
    <div className="container-wrap px-4 sm:px-6 py-12 sm:py-16 max-w-4xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-12">
        <p className="text-wine text-xs tracking-[0.3em] uppercase mb-3 font-semibold">
          Our Story
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-ink mb-4">
          About TANAVIA
        </h1>
        <div className="w-16 h-0.5 bg-wine mx-auto" />
      </div>

      {/* Intro */}
      <div className="prose prose-lg max-w-none text-ink/80 leading-relaxed space-y-5">
        <p className="text-lg">
          <strong className="text-wine">TANAVIA</strong> is a Bangladeshi
          fashion brand built on one simple idea —{' '}
          <em>fashion, lifestyle, you</em>. We believe everyone deserves
          premium quality without the premium price tag.
        </p>

        <p>
          From handcrafted bags and elegant shoes to everyday apparel, our
          collection is curated for people who want to look good and feel
          confident every single day.
        </p>
      </div>

      {/* Values */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-12">
        <ValueCard
          icon="✨"
          title="Premium Quality"
          desc="Every product is hand-checked before it reaches you."
        />
        <ValueCard
          icon="🚚"
          title="Fast Delivery"
          desc="Same-day dispatch. 2-3 day delivery across Bangladesh."
        />
        <ValueCard
          icon="💵"
          title="Cash on Delivery"
          desc="Pay when you receive. No advance payment required."
        />
      </div>

      {/* What we offer */}
      <div className="prose prose-lg max-w-none text-ink/80 leading-relaxed space-y-5">
        <h2 className="font-serif text-3xl font-semibold text-wine mt-12 mb-4">
          What We Offer
        </h2>
        <ul className="space-y-3 list-none pl-0">
          <li className="flex gap-3">
            <span className="text-wine font-bold">→</span>
            <span>
              <strong>Shoes</strong> — sneakers, formals, sandals and more
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-wine font-bold">→</span>
            <span>
              <strong>Bags</strong> — handbags, backpacks, totes and travel bags
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-wine font-bold">→</span>
            <span>
              <strong>Apparel</strong> — shirts, tees, kurtis and dresses for
              men, women and kids
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-wine font-bold">→</span>
            <span>
              <strong>Accessories</strong> — watches, wallets, belts and
              sunglasses
            </span>
          </li>
        </ul>
      </div>

      {/* Why TANAVIA */}
      <div className="prose prose-lg max-w-none text-ink/80 leading-relaxed space-y-5">
        <h2 className="font-serif text-3xl font-semibold text-wine mt-12 mb-4">
          Why Shop With Us?
        </h2>
        <ul className="space-y-3 list-none pl-0">
          <li className="flex gap-3">
            <span className="text-wine font-bold">✓</span>
            <span>100% authentic products — no replicas, no compromises</span>
          </li>
          <li className="flex gap-3">
            <span className="text-wine font-bold">✓</span>
            <span>7-day easy return policy — no questions asked</span>
          </li>
          <li className="flex gap-3">
            <span className="text-wine font-bold">✓</span>
            <span>
              Multiple payment options — bKash, Nagad, Rocket, Card and COD
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-wine font-bold">✓</span>
            <span>Friendly customer support on WhatsApp, every day</span>
          </li>
        </ul>
      </div>

      {/* Mission */}
      <div className="mt-12 p-6 sm:p-8 bg-sand rounded-lg border border-line">
        <h2 className="font-serif text-2xl font-semibold text-wine mb-3">
          Our Mission
        </h2>
        <p className="text-ink/80 leading-relaxed">
          To make premium fashion accessible to every household in Bangladesh —
          delivered fast, priced fair, and backed by service that actually
          cares.
        </p>
      </div>

      {/* CTA */}
      <div className="text-center mt-12">
        <h3 className="font-serif text-2xl font-semibold text-ink mb-4">
          Ready to explore?
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

function ValueCard({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="text-center p-5 bg-white border border-line rounded-lg">
      <div className="text-3xl mb-2">{icon}</div>
      <h3 className="font-semibold text-ink mb-1">{title}</h3>
      <p className="text-sm text-muted leading-relaxed">{desc}</p>
    </div>
  );
}