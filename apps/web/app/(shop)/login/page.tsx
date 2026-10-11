'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { PasswordInput } from '@/components/PasswordInput';
import { RememberMe } from '@/components/RememberMe';

export default function CustomerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      if (localStorage.getItem('tanavia_remember') === 'true') {
        return localStorage.getItem('tanavia_remember_email') || '';
      }
    } catch {}
    return '';
  });
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please fill in both fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post<{
        user: { id: string; name: string; email: string; role: string };
        accessToken: string;
      }>('/api/auth/login', { email: email.trim(), password });

      if (!res.data) throw new Error('Login failed');

      // Reject admin/staff trying to log into storefront
      if (res.data.user.role === 'ADMIN' || res.data.user.role === 'STAFF') {
        throw new Error(
          'This is a staff account. Please use the staff login portal.'
        );
      }

      // Store as customer session
      localStorage.setItem('tanavia_customer_token', res.data.accessToken);
      localStorage.setItem(
        'tanavia_customer_user',
        JSON.stringify(res.data.user)
      );

      // Save or clear remembered credentials
      if (remember) {
        localStorage.setItem('tanavia_remember_email', email.trim());
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
          : 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-wrap px-4 sm:px-6 py-12 sm:py-20 max-w-md mx-auto">
      {/* Hero */}
      <div className="text-center mb-8">
        <p className="text-wine text-xs tracking-[0.3em] uppercase mb-3 font-semibold">
          Welcome back
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-ink mb-3">
          Sign In
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
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-line bg-[#F7F8FA] px-4 py-3 text-sm outline-none focus:border-wine focus:bg-white transition"
              autoComplete="email"
              required
            />
          </div>

          <PasswordInput
            label="Password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />

          <RememberMe checked={remember} onChange={setRemember} />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-wine text-white px-6 py-3.5 rounded-lg text-sm font-semibold hover:bg-wine/90 transition disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-line" />
          <span className="text-xs text-muted">OR</span>
          <div className="flex-1 h-px bg-line" />
        </div>

        {/* Sign up link */}
        <p className="text-center text-sm text-muted">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="text-wine font-semibold hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>

      {/* Help */}
      <p className="text-center text-xs text-muted mt-6">
        Need help?{' '}
        <Link href="/contact" className="text-wine hover:underline">
          Contact us
        </Link>
      </p>
    </div>
  );
}