'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email.trim(), password);

      // Role check — only STAFF, MANAGER, ADMIN
      if (
        user.role !== 'STAFF' &&
        user.role !== 'MANAGER' &&
        user.role !== 'ADMIN'
      ) {
        setError(
          'This account does not have staff access. Please contact your manager.'
        );
        setLoading(false);
        return;
      }

      router.push('/staff/pos');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Login failed';
      setError(message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#1E3A5F] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-4xl font-semibold text-white mb-2 tracking-[0.2em]">
            TANAVIA
          </h1>
          <p className="text-white/60 text-sm tracking-[0.15em]">
            STAFF PANEL
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="font-serif text-2xl font-semibold text-[#1E293B] mb-1">
            Sign In
          </h2>
          <p className="text-[#64748B] text-sm mb-6">
            Enter your staff credentials to continue
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#1E293B] mb-2 block">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@tanavia.com"
                className="w-full bg-[#F1F4F9] border border-transparent rounded-lg px-4 py-3 text-sm focus:outline-none focus:bg-white focus:border-[#1E3A5F] transition"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#1E293B] mb-2 block">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#F1F4F9] border border-transparent rounded-lg px-4 py-3 text-sm focus:outline-none focus:bg-white focus:border-[#1E3A5F] transition"
              />
            </div>

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1E3A5F] hover:bg-[#152B45] text-white rounded-lg py-3 font-semibold text-sm transition disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-xs text-[#64748B] hover:text-[#1E3A5F]"
            >
              ← Back to Store
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/40 text-xs mt-6">
          TANAVIA Staff Portal · Authorized Access Only
        </p>
      </div>
    </div>
  );
}