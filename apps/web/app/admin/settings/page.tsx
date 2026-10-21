'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getToken, getCurrentUser } from '@/lib/auth';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '', confirm: '' });

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setProfile({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: (currentUser as any).phone || '',
      });
    }
    setLoading(false);
  }, []);

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const token = getToken() || undefined;
      const res = await api.patch('/api/auth/profile', profile, { token });
      localStorage.setItem('tanavia_user', JSON.stringify(res.data));
      setMessage({ type: 'success', text: '✓ Profile updated! Reload page to see changes.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirm) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (passwords.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const token = getToken() || undefined;
      await api.post('/api/auth/change-password', {
        oldPassword: passwords.oldPassword,
        newPassword: passwords.newPassword,
      }, { token });
      setMessage({ type: 'success', text: '✓ Password changed successfully!' });
      setPasswords({ oldPassword: '', newPassword: '', confirm: '' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to change password' });
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] transition';

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div className="p-8 bg-[#F7F8FA] min-h-screen">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="font-serif text-3xl font-semibold text-[#0F2A5C] mb-1">Settings</h1>
          <p className="text-[#8A8F98] text-sm">Manage your account, profile and password</p>
        </div>

        {message && (
          <div className={`mb-5 rounded-lg px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Profile Section */}
        <section className="bg-white rounded-xl border border-[#E8EBF0] p-6 mb-5">
          <h2 className="font-semibold text-[#0F2A5C] mb-4 flex items-center gap-2 text-lg">
            👤 Profile Information
          </h2>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Name</label>
              <input type="text" required value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
              <input type="email" required value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
              <input type="text" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className={inputClass} placeholder="01XXXXXXXXX" />
            </div>
            <button type="submit" disabled={saving} className="bg-[#0F2A5C] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#0A1F45] disabled:opacity-50">
              {saving ? 'Saving...' : 'Update Profile'}
            </button>
          </form>
        </section>

        {/* Password Section */}
        <section className="bg-white rounded-xl border border-[#E8EBF0] p-6 mb-5">
          <h2 className="font-semibold text-[#0F2A5C] mb-4 flex items-center gap-2 text-lg">
            🔒 Change Password
          </h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Current Password</label>
              <input type="password" required value={passwords.oldPassword} onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">New Password</label>
              <input type="password" required value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} className={inputClass} placeholder="At least 8 characters" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Confirm New Password</label>
              <input type="password" required value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} className={inputClass} />
            </div>
            <button type="submit" disabled={saving} className="bg-[#0F2A5C] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#0A1F45] disabled:opacity-50">
              {saving ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </section>

        {/* Staff Management Link */}
        <section className="bg-white rounded-xl border border-[#E8EBF0] p-6">
          <h2 className="font-semibold text-[#0F2A5C] mb-3 flex items-center gap-2 text-lg">
            👥 Manage Staff & Admins
          </h2>
          <p className="text-sm text-[#8A8F98] mb-4">
            Add new staff or admin accounts, change their roles, or deactivate them from the Staff Management page.
          </p>
          <Link href="/admin/staff" className="inline-flex items-center gap-2 bg-[#0F2A5C] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#0A1F45]">
            → Go to Staff Management
          </Link>
        </section>
      </div>
    </div>
  );
}