'use client';

import Link from 'next/link';
import { useState } from 'react';

interface FAQ {
  q: string;
  a: string;
}

interface FAQCategory {
  id: string;
  icon: string;
  title: string;
  faqs: FAQ[];
}

const CATEGORIES: FAQCategory[] = [
  {
    id: 'orders',
    icon: '📦',
    title: 'Orders & Delivery',
    faqs: [
      {
        q: 'How long will it take to receive my order?',
        a: 'Inside Dhaka: 2-3 business days. Outside Dhaka: 3-5 business days. Delivery times may vary due to weather or courier delays.',
      },
      {
        q: 'Can I track my order?',
        a: 'Yes. Once your order is shipped, we send a tracking link via SMS and WhatsApp. You can also track from the "Track Order" page using your order number.',
      },
      {
        q: 'Do you deliver outside Bangladesh?',
        a: 'Currently, we only deliver inside Bangladesh. International shipping is coming soon.',
      },
      {
        q: 'What if I miss the delivery?',
        a: 'Our courier will try to contact you before delivery. If you miss it, they will attempt once more. After two failed attempts, the order may be returned to us.',
      },
      {
        q: 'Can I change my delivery address after ordering?',
        a: 'Yes, if the order has not been shipped yet. Contact us on WhatsApp with your order number as soon as possible.',
      },
    ],
  },
  {
    id: 'payment',
    icon: '💳',
    title: 'Payment',
    faqs: [
      {
        q: 'What payment methods do you accept?',
        a: 'We accept Cash on Delivery (COD), bKash, Nagad, Rocket, and Card payments.',
      },
      {
        q: 'Is Cash on Delivery available everywhere?',
        a: 'Yes, COD is available across Bangladesh. Just choose "Cash On Delivery" at checkout.',
      },
      {
        q: 'I sent money via bKash but my order shows pending. Why?',
        a: 'Our team verifies every mobile wallet payment manually. This usually takes 30 minutes to 2 hours during business hours. If it takes longer, contact us on WhatsApp.',
      },
      {
        q: 'Is it safe to pay by card on your website?',
        a: 'Yes. All card payments go through a PCI-compliant secure gateway. We never store your card details on our servers.',
      },
      {
        q: 'Can I pay half now and half on delivery?',
        a: 'No, we currently do not offer partial payment options. Please pay the full amount either online or on delivery.',
      },
    ],
  },
  {
    id: 'returns',
    icon: '↩️',
    title: 'Returns & Refunds',
    faqs: [
      {
        q: 'What is your return policy?',
        a: 'You can return an item within 7 days of delivery, provided it is unused, in original condition, and with all tags and packaging intact.',
      },
      {
        q: 'How long does a refund take?',
        a: 'Refunds are processed within 7-10 business days after we receive and inspect the returned item.',
      },
      {
        q: 'Do you refund COD orders?',
        a: 'For COD orders, no refund applies because no advance payment was made. If you received a damaged item, we offer a free replacement instead.',
      },
      {
        q: 'Who pays for return shipping?',
        a: 'If the return is due to our error (damaged, wrong, or defective item), we cover all shipping costs. For other reasons (size or color swap), the customer covers shipping.',
      },
      {
        q: 'Can I exchange an item instead of getting a refund?',
        a: 'Yes. We offer free exchanges for damaged or wrong items, subject to stock availability. If out of stock, we issue a full refund.',
      },
    ],
  },
  {
    id: 'products',
    icon: '🛍️',
    title: 'Products & Sizing',
    faqs: [
      {
        q: 'How do I know which size to order?',
        a: 'Every product page has a size chart with measurements. If you are still unsure, message us on WhatsApp with your usual size and we will recommend the best fit.',
      },
      {
        q: 'Are the colors exactly as shown in the photos?',
        a: 'We try to display colors as accurately as possible. However, slight variations may occur due to screen settings and photography lighting.',
      },
      {
        q: 'Do you restock sold-out items?',
        a: 'Popular items are often restocked. You can follow us on Facebook or Instagram to get notified when items come back in stock.',
      },
      {
        q: 'Are the products authentic?',
        a: 'Yes, 100%. Every TANAVIA product is sourced directly and quality-checked before shipping. We never sell replicas or second-hand items.',
      },
    ],
  },
  {
    id: 'account',
    icon: '👤',
    title: 'Account & Security',
    faqs: [
      {
        q: 'Do I need an account to place an order?',
        a: 'No, you can checkout as a guest. However, creating an account lets you track orders, save addresses, and get faster checkout next time.',
      },
      {
        q: 'I forgot my password. How do I reset it?',
        a: 'On the login page, click "Forgot Password" and enter your registered email. You will receive a reset link within a few minutes.',
      },
      {
        q: 'Is my personal information safe?',
        a: 'Yes. We use industry-standard encryption and never sell your data. See our Privacy Policy for full details.',
      },
    ],
  },
  {
    id: 'contact',
    icon: '📞',
    title: 'Contact & Support',
    faqs: [
      {
        q: 'How can I contact TANAVIA?',
        a: 'You can reach us on WhatsApp (+880 9612-345678), email (hello@tanavia.com), or through our Facebook page. We reply within 24 hours.',
      },
      {
        q: 'What are your customer care hours?',
        a: 'Our team is available every day from 10 AM to 8 PM (Bangladesh time). Messages received outside these hours will be answered the next morning.',
      },
      {
        q: 'I have a problem with my order. What should I do?',
        a: 'Message us on WhatsApp with your order number and a short description of the issue. Our team will resolve it within one business day.',
      },
    ],
  },
];

export default function FAQsPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Filter FAQs by category + search
  const filteredCategories = CATEGORIES.map((cat) => ({
    ...cat,
    faqs: cat.faqs.filter(
      (f) =>
        search.trim() === '' ||
        f.q.toLowerCase().includes(search.toLowerCase()) ||
        f.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(
    (cat) =>
      (activeCategory === 'all' || cat.id === activeCategory) &&
      cat.faqs.length > 0
  );

  const totalResults = filteredCategories.reduce(
    (sum, c) => sum + c.faqs.length,
    0
  );

  return (
    <div className="container-wrap px-4 sm:px-6 py-12 sm:py-16 max-w-4xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-10">
        <p className="text-wine text-xs tracking-[0.3em] uppercase mb-3 font-semibold">
          Help Center
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-ink mb-4">
          Frequently Asked Questions
        </h1>
        <div className="w-16 h-0.5 bg-wine mx-auto mb-4" />
        <p className="text-muted text-sm sm:text-base max-w-lg mx-auto">
          Everything you need to know about shopping with TANAVIA. Can&apos;t
          find your answer? Contact us on WhatsApp.
        </p>
      </div>

      {/* Search */}
      <div className="mb-6 max-w-xl mx-auto">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search a question or topic..."
            className="w-full rounded-full border border-line bg-white px-5 py-3 pl-12 text-sm outline-none focus:border-wine transition"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
            🔍
          </span>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-wine text-sm"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        {search && (
          <p className="text-xs text-muted mt-2 text-center">
            {totalResults} result{totalResults !== 1 ? 's' : ''} found
          </p>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition ${
            activeCategory === 'all'
              ? 'bg-wine text-white'
              : 'bg-white border border-line text-ink hover:border-wine'
          }`}
        >
          All Topics
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition flex items-center gap-1.5 ${
              activeCategory === cat.id
                ? 'bg-wine text-white'
                : 'bg-white border border-line text-ink hover:border-wine'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.title}</span>
          </button>
        ))}
      </div>

      {/* No results */}
      {filteredCategories.length === 0 && (
        <div className="text-center py-16 bg-sand rounded-lg border border-line">
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-serif text-xl font-semibold text-ink mb-2">
            No results found
          </p>
          <p className="text-sm text-muted mb-6">
            Try a different keyword or browse all topics.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setActiveCategory('all');
            }}
            className="btn text-sm"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* FAQ sections */}
      <div className="space-y-10">
        {filteredCategories.map((cat) => (
          <section key={cat.id}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-full bg-wine/10 flex items-center justify-center text-xl flex-shrink-0">
                {cat.icon}
              </div>
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-semibold text-ink">
                  {cat.title}
                </h2>
                <p className="text-xs text-muted">
                  {cat.faqs.length} question{cat.faqs.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {cat.faqs.map((faq, idx) => {
                const id = `${cat.id}-${idx}`;
                const isOpen = openId === id;
                return (
                  <div
                    key={id}
                    className={`rounded-lg border transition ${
                      isOpen
                        ? 'border-wine bg-white shadow-sm'
                        : 'border-line bg-white hover:border-wine/50'
                    }`}
                  >
                    <button
                      onClick={() => setOpenId(isOpen ? null : id)}
                      className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                      aria-expanded={isOpen}
                    >
                      <span
                        className={`font-medium text-sm sm:text-base ${
                          isOpen ? 'text-wine' : 'text-ink'
                        }`}
                      >
                        {faq.q}
                      </span>
                      <span
                        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-lg transition-transform ${
                          isOpen
                            ? 'bg-wine text-white rotate-45'
                            : 'bg-wine/10 text-wine'
                        }`}
                      >
                        +
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 pt-0 text-sm text-ink/80 leading-relaxed border-t border-line/50 mt-2 pt-4">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Still need help CTA */}
      <div className="mt-16 p-6 sm:p-8 bg-sand rounded-lg border border-line text-center">
        <div className="text-3xl mb-3">💬</div>
        <h3 className="font-serif text-2xl font-semibold text-ink mb-2">
          Still have questions?
        </h3>
        <p className="text-sm text-muted mb-6 max-w-md mx-auto">
          Our customer care team is here every day from 10 AM to 8 PM. We reply
          within 24 hours.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <a
            href="https://wa.me/8809612345678"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-wine text-white px-5 py-3 rounded-lg text-sm font-semibold hover:bg-wine/90 transition"
          >
            💬 WhatsApp Us
          </a>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-white border border-line text-ink px-5 py-3 rounded-lg text-sm font-semibold hover:border-wine transition"
          >
            📧 Contact Form
          </Link>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center mt-12">
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