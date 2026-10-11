'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { PasswordInput } from '@/components/PasswordInput';
import { RememberMe } from '@/components/RememberMe';

export default function CustomerRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError('Please fill in name, email, and password');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Please enter a valid email');
      return;
    }

    // Validate phone if provided (Bangladesh format)
    if (form.phone.trim()) {
      const phoneClean = form.phone.trim().replace(/\s|-/g, '');
      const bdPhone = /^(?:\+?88)?01[3-9]\d{8}$/;
      if (!bdPhone.test(phoneClean)) {
        setError(
          'Phone must be a valid Bangladeshi number (e.g. 01893671095)'
        );
        return;
      }
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{
        user: { id: string; name: string; email: string; role: string };
        accessToken: string;
      }>('/api/auth/register', {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
        role: 'CUSTOMER',
      });

      if (!res.data) throw new Error('Registration failed');

      // Store customer session
      localStorage.setItem('tanavia_customer_token', res.data.accessToken);
      localStorage.setItem(
        'tanavia_customer_user',
        JSON.stringify(res.data.user)
      );

      // Save or clear remembered credentials
      if (remember) {
        localStorage.setItem(
          'tanavia_remember_email',
          form.email.trim()
        );
        localStorage.setItem('tanavia_remember', 'true');
      } else {
        localStorage.removeItem('tanavia_remember_email');
        localStorage.setItem('tanavia_remember', 'false');
      }

      router.push('/account');
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Registration failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-wrap px-4 sm:px-6 py-12 sm:py-16 max-w-md mx-auto">
      {/* Hero */}
      <div className="text-center mb-8">
        <p className="text-wine text-xs tracking-[0.3em] uppercase mb-3 font-semibold">
          Join TANAVIA
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-ink mb-3">
          Create Account
        </h1>
        <div className="w-16 h-0.5 bg-wine mx-auto" />
      </div>

      <div className="bg-white border border-line rounded-lg p-6 sm:p-8 shadow-sm">
        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1.5 font-semibold">
              Full Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Your name"
              className="w-full rounded-lg border border-line bg-[#F7F8FA] px-4 py-3 text-sm outline-none focus:border-wine focus:bg-white transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1.5 font-semibold">
              Email *
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-line bg-[#F7F8FA] px-4 py-3 text-sm outline-none focus:border-wine focus:bg-white transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1.5 font-semibold">
              Phone (optional)
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="01XXXXXXXXX"
              className="w-full rounded-lg border border-line bg-[#F7F8FA] px-4 py-3 text-sm outline-none focus:border-wine focus:bg-white transition"
            />
          </div>

          <PasswordInput
            label="Password"
            value={form.password}
            onChange={(v) => update('password', v)}
            placeholder="Min 10 chars with A-Z, a-z, 0-9, !@#"
            autoComplete="new-password"
            required
            showHints
          />

          <PasswordInput
            label="Confirm Password"
            value={form.confirmPassword}
            onChange={(v) => update('confirmPassword', v)}
            placeholder="Re-type password"
            autoComplete="new-password"
            required
          />

          <RememberMe checked={remember} onChange={setRemember} />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-wine text-white px-6 py-3.5 rounded-lg text-sm font-semibold hover:bg-wine/90 transition disabled:opacity-60"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-wine font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>

      <p className="text-xs text-muted text-center mt-6">
        By creating an account, you agree to our{' '}
        <Link href="/terms" className="text-wine hover:underline">
          Terms
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="text-wine hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}