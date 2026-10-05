'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface Props {
  onClose: () => void;
  onSuccess: (customer: any) => void;
}

export function AddCustomerModal({ onClose, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Name and phone are required');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const token = getToken() || undefined;
      const res = await api.post(
        '/api/customers',
        {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
        },
        { token }
      );

      onSuccess(res.data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to create customer');
      }
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-serif text-xl font-semibold text-[#0F2A5C] mb-2">
          Add customer
        </h3>
        <p className="text-sm text-[#8A8F98] mb-5">
          Name and phone are enough. The phone number is the customer&apos;s ID.
        </p>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            autoFocus
            className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] mb-4"
          />

          <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
            Phone
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01XXXXXXXXX"
            className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] mb-4 font-mono"
          />

          <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
            Email <span className="text-[10px] normal-case">(optional)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] mb-5"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 bg-white border border-[#E8EBF0] text-[#0F2A5C] px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#F1F3F6] transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim() || !phone.trim()}
              className="flex-1 bg-[#0F2A5C] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#0A1F45] transition disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
