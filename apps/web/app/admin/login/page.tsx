'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login, isAdmin } from '@/lib/auth';

export default function AdminLoginPage() {
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
      if (!isAdmin() && user.role !== 'ADMIN') {
        setError('This account does not have admin access');
        setLoading(false);
        return;
      }
      router.push('/admin/dashboard');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Login failed';
      setError(message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0F2A5C] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-4xl font-semibold text-white mb-2">
            TANAVIA
          </h1>
          <p className="text-white/60 text-sm">Admin Panel</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="font-serif text-2xl font-semibold text-[#0F2A5C] mb-1">
            Sign In
          </h2>
          <p className="text-[#8A8F98] text-sm mb-6">
            Enter your admin credentials to continue
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#0F2A5C] mb-2 block">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@tanavia.com"
                className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-4 py-3 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] transition"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#0F2A5C] mb-2 block">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-4 py-3 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] transition"
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
              className="w-full bg-[#0F2A5C] hover:bg-[#0A1F45] text-white rounded-lg py-3 font-semibold text-sm transition disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-xs text-[#8A8F98] hover:text-[#0F2A5C]"
            >
              ← Back to Store
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}