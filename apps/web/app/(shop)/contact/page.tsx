'use client';

import Link from 'next/link';
import { useState } from 'react';

const CONTACT_INFO = {
  email: 'tanaviashop@gmail.com',
  phone: '01620934350',
  whatsapp: '+8801620934350',
  instagram: 'https://www.instagram.com/tanavia.bd',
  tiktok: 'https://www.tiktok.com/@tanavia.shop?lang=en',
  pinterest: 'https://pin.it/6AYZzBX3E',
  facebook: 'https://www.facebook.com/profile.php?id=61594727540694',
};

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'General Inquiry',
    message: '',
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Please fill in your name, email, and message.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setSending(true);
    try {
      // Placeholder: real backend endpoint can be added later
      await new Promise((r) => setTimeout(r, 800));
      setSent(true);
      setForm({
        name: '',
        email: '',
        phone: '',
        subject: 'General Inquiry',
        message: '',
      });
      setTimeout(() => setSent(false), 6000);
    } catch {
      setError('Failed to send message. Please try WhatsApp or email.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="container-wrap px-4 sm:px-6 py-12 sm:py-16 max-w-6xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-12">
        <p className="text-wine text-xs tracking-[0.3em] uppercase mb-3 font-semibold">
          Get in touch
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-ink mb-4">
          Contact Us
        </h1>
        <div className="w-16 h-0.5 bg-wine mx-auto mb-4" />
        <p className="text-muted text-sm sm:text-base max-w-lg mx-auto">
          We&apos;d love to hear from you. Reach out for orders, support, or
          partnership inquiries — we reply within 24 hours.
        </p>
      </div>

      {/* ============================================ */}
      {/* Quick contact cards */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
        {/* Email */}
        <a
          href={`mailto:${CONTACT_INFO.email}`}
          className="group bg-white border border-line rounded-lg p-5 text-center hover:border-wine hover:shadow-sm transition"
        >
          <div className="w-12 h-12 rounded-full bg-wine/10 flex items-center justify-center text-xl mx-auto mb-3 group-hover:bg-wine/20 transition">
            ✉️
          </div>
          <h3 className="font-semibold text-ink mb-1">Email</h3>
          <p className="text-xs sm:text-sm text-muted break-all">
            {CONTACT_INFO.email}
          </p>
        </a>

        {/* Phone / WhatsApp */}
        <a
          href={`https://wa.me/${CONTACT_INFO.whatsapp.replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noreferrer"
          className="group bg-white border border-line rounded-lg p-5 text-center hover:border-wine hover:shadow-sm transition"
        >
          <div className="w-12 h-12 rounded-full bg-wine/10 flex items-center justify-center text-xl mx-auto mb-3 group-hover:bg-wine/20 transition">
            📱
          </div>
          <h3 className="font-semibold text-ink mb-1">Phone / WhatsApp</h3>
          <p className="text-xs sm:text-sm text-muted">{CONTACT_INFO.phone}</p>
        </a>

        {/* Hours */}
        <div className="bg-white border border-line rounded-lg p-5 text-center">
          <div className="w-12 h-12 rounded-full bg-wine/10 flex items-center justify-center text-xl mx-auto mb-3">
            ⏰
          </div>
          <h3 className="font-semibold text-ink mb-1">Business Hours</h3>
          <p className="text-xs sm:text-sm text-muted">
            Every day · 10 AM – 8 PM
          </p>
        </div>
      </div>

      {/* ============================================ */}
      {/* Form + Social sidebar */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-line rounded-lg p-5 sm:p-7">
            <h2 className="font-serif text-2xl font-semibold text-ink mb-1">
              Send us a message
            </h2>
            <p className="text-sm text-muted mb-6">
              Fill in the form and we&apos;ll get back to you as soon as
              possible.
            </p>

            {sent && (
              <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
                ✅ Thank you! Your message has been received. We&apos;ll reply
                within 24 hours.
              </div>
            )}

            {error && (
              <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="Full name"
                    className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm outline-none focus:border-wine transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm outline-none focus:border-wine transition"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Phone (optional)
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm outline-none focus:border-wine transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Subject
                  </label>
                  <select
                    value={form.subject}
                    onChange={(e) => update('subject', e.target.value)}
                    className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm outline-none focus:border-wine transition"
                  >
                    <option>General Inquiry</option>
                    <option>Order Support</option>
                    <option>Return / Refund</option>
                    <option>Product Question</option>
                    <option>Partnership / Business</option>
                    <option>Feedback</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Message *
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => update('message', e.target.value)}
                  placeholder="Write your message here..."
                  rows={5}
                  className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm outline-none focus:border-wine transition resize-y"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-wine text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-wine/90 transition disabled:opacity-60"
              >
                {sending ? (
                  'Sending...'
                ) : (
                  <>
                    Send Message
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
                      <path d="M22 2L11 13" />
                      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar — social */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-line rounded-lg p-5 sm:p-6 sticky top-24">
            <h2 className="font-serif text-xl font-semibold text-ink mb-1">
              Follow TANAVIA
            </h2>
            <p className="text-sm text-muted mb-5">
              Stay updated on new arrivals, offers, and behind-the-scenes.
            </p>

            <div className="space-y-2">
              <SocialLink
                href={CONTACT_INFO.facebook}
                label="Facebook"
                handle="TANAVIA"
                bgClass="bg-[#1877F2]"
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.3-1.5 1.6-1.5h1.6V3.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.3H7.6V13h2.6v8h3.3z" />
                  </svg>
                }
              />
              <SocialLink
                href={CONTACT_INFO.instagram}
                label="Instagram"
                handle="@tanavia.bd"
                bgClass="bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]"
                icon={
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1" fill="white" stroke="none" />
                  </svg>
                }
              />
              <SocialLink
                href={CONTACT_INFO.tiktok}
                label="TikTok"
                handle="@tanavia.shop"
                bgClass="bg-black"
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M16.5 3h-3v12.5a3 3 0 1 1-3-3v-3a6 6 0 1 0 6 6V8.5c1 .8 2.2 1.3 3.5 1.3V6.8c-1.9 0-3.5-1.6-3.5-3.5V3z" />
                  </svg>
                }
              />
              <SocialLink
                href={CONTACT_INFO.pinterest}
                label="Pinterest"
                handle="tanavia"
                bgClass="bg-[#E60023]"
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.3-5.5s-.3-.7-.3-1.7c0-1.6.9-2.8 2.1-2.8 1 0 1.5.7 1.5 1.6 0 1-.6 2.5-1 3.9-.3 1.1.6 2.1 1.7 2.1 2 0 3.5-2.1 3.5-5.2 0-2.7-2-4.6-4.7-4.6-3.2 0-5.1 2.4-5.1 4.9 0 1 .4 2 .8 2.6.1.1.1.2.1.3l-.3 1.2c0 .2-.2.3-.4.2-1.4-.7-2.3-2.7-2.3-4.3 0-3.5 2.5-6.7 7.3-6.7 3.8 0 6.8 2.7 6.8 6.4 0 3.8-2.4 6.9-5.7 6.9-1.1 0-2.2-.6-2.5-1.3l-.7 2.6c-.3 1-.9 2.3-1.4 3A10 10 0 1 0 12 2z" />
                  </svg>
                }
              />
            </div>

            {/* WhatsApp CTA */}
            <a
              href={`https://wa.me/${CONTACT_INFO.whatsapp.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="mt-6 block bg-emerald-500 hover:bg-emerald-600 text-white text-center py-3 rounded-lg text-sm font-semibold transition"
            >
              💬 Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* FAQ teaser */}
      {/* ============================================ */}
      <div className="mt-16 p-6 sm:p-8 bg-sand rounded-lg border border-line text-center">
        <div className="text-3xl mb-3">🤔</div>
        <h3 className="font-serif text-2xl font-semibold text-ink mb-2">
          Looking for quick answers?
        </h3>
        <p className="text-sm text-muted mb-6 max-w-md mx-auto">
          Check our FAQ page — most common questions are answered there in
          seconds.
        </p>
        <Link
          href="/faqs"
          className="inline-flex items-center gap-2 bg-white border border-line text-ink px-5 py-3 rounded-lg text-sm font-semibold hover:border-wine transition"
        >
          📖 View FAQs
        </Link>
      </div>
    </div>
  );
}

// ============================================
// Social Link Component
// ============================================
function SocialLink({
  href,
  label,
  handle,
  icon,
  bgClass,
}: {
  href: string;
  label: string;
  handle: string;
  icon: React.ReactNode;
  bgClass: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 p-3 rounded-lg border border-line hover:border-wine transition group"
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${bgClass}`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-ink group-hover:text-wine transition">
          {label}
        </div>
        <div className="text-xs text-muted truncate">{handle}</div>
      </div>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-muted group-hover:text-wine transition flex-shrink-0"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </a>
  );
}