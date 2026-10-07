'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function StaffNotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = getToken() || undefined;
        const res = await api.get<Notification[]>(
          '/api/staff/notifications',
          { token }
        );
        setItems(res.data || []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div
      className="p-4 sm:p-6 md:p-8 min-h-screen"
      style={{ background: 'var(--staff-bg)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--staff-primary)' }}
        >
          <span className="text-white font-bold text-lg sm:text-xl">🔔</span>
        </div>
        <div>
          <h1
            className="font-serif text-xl sm:text-2xl md:text-3xl font-semibold"
            style={{ color: 'var(--staff-text)' }}
          >
            Notifications
          </h1>
          <p
            className="text-xs sm:text-sm"
            style={{ color: 'var(--staff-muted)' }}
          >
            Alerts and updates
          </p>
        </div>
      </div>

      {loading ? (
        <div
          className="p-16 text-center text-sm rounded-lg border"
          style={{
            background: 'var(--staff-card)',
            borderColor: 'var(--staff-border)',
            color: 'var(--staff-muted)',
          }}
        >
          Loading...
        </div>
      ) : items.length === 0 ? (
        <div
          className="p-16 text-center rounded-lg border"
          style={{
            background: 'var(--staff-card)',
            borderColor: 'var(--staff-border)',
          }}
        >
          <div className="text-4xl mb-3">🔔</div>
          <p
            className="text-sm font-medium mb-1"
            style={{ color: 'var(--staff-text)' }}
          >
            No notifications yet
          </p>
          <p className="text-xs" style={{ color: 'var(--staff-muted)' }}>
            You&apos;ll see alerts about orders, stock, and shifts here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <div
              key={n.id}
              className="rounded-lg border p-4"
              style={{
                background: 'var(--staff-card)',
                borderColor: 'var(--staff-border)',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    n.type === 'ORDER'
                      ? 'bg-blue-50 text-blue-700'
                      : n.type === 'STOCK'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {n.type === 'ORDER' ? '📦' : n.type === 'STOCK' ? '⚠️' : '🔔'}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="font-semibold text-sm"
                    style={{ color: 'var(--staff-text)' }}
                  >
                    {n.title}
                  </div>
                  <div
                    className="text-xs mt-0.5"
                    style={{ color: 'var(--staff-muted)' }}
                  >
                    {n.message}
                  </div>
                  <div
                    className="text-[10px] mt-1"
                    style={{ color: 'var(--staff-muted)' }}
                  >
                    {formatDateTime(n.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}