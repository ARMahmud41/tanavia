'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function TrackPage() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState('');
  const [error, setError] = useState('');

  function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    const q = orderNumber.trim().toUpperCase();
    if (!q) {
      setError('Please enter your order number');
      return;
    }
    if (q.length < 6) {
      setError('Order number looks too short');
      return;
    }
    router.push(`/track/${encodeURIComponent(q)}`);
  }

  return (
    <div className="container-wrap px-4 sm:px-6 py-12 sm:py-16 max-w-2xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-10">
        <p className="text-wine text-xs tracking-[0.3em] uppercase mb-3 font-semibold">
          Order Tracking
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-ink mb-4">
          Track Your Order
        </h1>
        <div className="w-16 h-0.5 bg-wine mx-auto mb-4" />
        <p className="text-muted text-sm sm:text-base max-w-lg mx-auto">
          Enter your order number to see where your package is right now.
          You can find it in your order confirmation SMS, email, or WhatsApp
          message.
        </p>
      </div>

      {/* Search card */}
      <div className="bg-white border border-line rounded-lg p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleTrack} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-2 font-semibold">
              Order Number
            </label>
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => {
                setOrderNumber(e.target.value);
                setError('');
              }}
              placeholder="TN-XXXXXX"
              className="w-full rounded-lg border border-line bg-[#F7F8FA] px-4 py-3 text-base font-mono outline-none focus:border-wine focus:bg-white transition"
              autoFocus
            />
            <p className="text-xs text-muted mt-2">
              Example: <span className="font-mono">TN-238602</span>
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-wine text-white px-6 py-3.5 rounded-lg text-sm font-semibold hover:bg-wine/90 transition flex items-center justify-center gap-2"
          >
            Track Order
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
          </button>
        </form>
      </div>

      {/* Help */}
      <div className="mt-8 p-5 bg-sand rounded-lg border border-line text-sm">
        <p className="text-ink/80 mb-2">
          <strong>Can&apos;t find your order number?</strong>
        </p>
        <ul className="space-y-1.5 text-muted">
          <li>• Check your confirmation SMS or WhatsApp message</li>
          <li>• Look in your email inbox (including spam)</li>
          <li>
            • Or{' '}
            <Link
              href="/contact"
              className="text-wine font-semibold hover:underline"
            >
              contact our team
            </Link>{' '}
            and we&apos;ll find it for you
          </li>
        </ul>
      </div>
    </div>
  );
}