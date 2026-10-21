'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { CustomerAvatar } from '@/components/customers/CustomerAvatar';
import { CustomerStatusBadge } from '@/components/customers/StatusBadge';
import { tk, formatDateTime } from '@/lib/format';

// ============================================
// Types
// ============================================
interface Order {
  id: string;
  orderNumber: string;
  channel: string;
  status: string;
  total: string | number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  _count?: { items: number };
}

interface Address {
  id: string;
  address: string;
  district: string;
  upazila: string;
  isDefault: boolean;
}

interface CustomerNote {
  id: string;
  text: string;
  pinned: boolean;
  createdAt: string;
  authorId: string;
}

interface CustomerTag {
  id: string;
  tag: string;
  createdAt: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  userId?: string | null;
  blockedAt?: string | null;
  blockedReason?: string | null;
  createdAt: string;
  updatedAt: string;
  orders: Order[];
  notes: CustomerNote[];
  tags: CustomerTag[] | false;
  stats: {
    orders: number;
    totalSpent?: number;
    avgOrder?: number;
    returns: number;
    returnRate?: number;
    needsReview?: boolean;
    lastOrder?: string | null;
  };
}

const STATUS_COLORS: Record<string, string> = {
  PLACED: 'bg-blue-50 text-blue-700 border-blue-200',
  CONFIRMED: 'bg-amber-50 text-amber-700 border-amber-200',
  PACKED: 'bg-purple-50 text-purple-700 border-purple-200',
  SHIPPED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  RETURNED: 'bg-gray-100 text-gray-700 border-gray-300',
};

export default function AdminCustomerProfilePage() {
  const params = useParams();
  const customerId = params?.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<
    'overview' | 'orders' | 'returns' | 'addresses' | 'notes' | 'tags'
  >('overview');

  const [showBlock, setShowBlock] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagText, setTagText] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const [res, addrRes] = await Promise.all([
        api.get<Customer>(`/api/customers/${customerId}`, { token }),
        api.get<Address[]>(`/api/customers/${customerId}/addresses`, { token }).catch(() => ({ data: [] })),
      ]);
      setCustomer(res.data || null);
      setAddresses(addrRes.data || []);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to load';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (customerId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  async function handleBlock() {
    if (!blockReason.trim()) return alert('Please provide a reason');
    setBusy(true);
    try {
      const token = getToken() || undefined;
      await api.post(`/api/customers/${customerId}/block`, { reason: blockReason.trim() }, { token });
      setShowBlock(false);
      setBlockReason('');
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Block failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleUnblock() {
    if (!confirm('Unblock this customer?')) return;
    setBusy(true);
    try {
      const token = getToken() || undefined;
      await api.post(`/api/customers/${customerId}/unblock`, {}, { token });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unblock failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    setBusy(true);
    try {
      const token = getToken() || undefined;
      await api.post(`/api/customers/${customerId}/notes`, { text: noteText.trim() }, { token });
      setShowNoteModal(false);
      setNoteText('');
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add note');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddTag() {
    if (!tagText.trim()) return;
    setBusy(true);
    try {
      const token = getToken() || undefined;
      await api.post(`/api/customers/${customerId}/tags`, { tag: tagText.trim() }, { token });
      setShowTagModal(false);
      setTagText('');
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add tag');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteTag(tag: string) {
    if (!confirm(`Remove tag "${tag}"?`)) return;
    setBusy(true);
    try {
      const token = getToken() || undefined;
      await api.delete(`/api/customers/${customerId}/tags/${encodeURIComponent(tag)}`, { token });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove tag');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="p-8 bg-[#F7F8FA] min-h-screen text-center text-[#8A8F98] py-16">Loading customer...</div>;
  }

  if (error || !customer) {
    return (
      <div className="p-8 bg-[#F7F8FA] min-h-screen">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-8 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h1 className="font-serif text-xl font-semibold text-[#0F2A5C] mb-2">Customer Not Found</h1>
          <p className="text-sm text-[#8A8F98] mb-4">{error || 'This customer does not exist.'}</p>
          <Link href="/admin/customers" className="inline-block bg-[#0F2A5C] text-white px-4 py-2 rounded-lg text-sm font-medium">← Back to Customers</Link>
        </div>
      </div>
    );
  }

  const recentOrders = customer.orders.slice(0, 3);
  const isBlocked = !!customer.blockedAt;
  const tags = Array.isArray(customer.tags) ? customer.tags : [];
  const pinnedNote = customer.notes.find((n) => n.pinned);
  
  // 🟢 Determine Default Address
  const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];

  let statusBadge = 'NEW';
  if (isBlocked) statusBadge = 'BLOCKED';
  else if (customer.stats.orders >= 5 || (customer.stats.totalSpent || 0) >= 50000) statusBadge = 'VIP';
  else if (customer.stats.orders >= 2) statusBadge = 'REPEAT';
  else if (customer.stats.orders >= 1) statusBadge = 'ACTIVE';

  return (
    <div className="p-8 bg-[#F7F8FA] min-h-screen">
      <Link href="/admin/customers" className="inline-flex items-center gap-1 text-sm text-[#8A8F98] hover:text-[#0F2A5C] mb-5">
        ← Back to customers
      </Link>

      {isBlocked && (
        <div className="mb-5 px-4 py-3 rounded-lg border bg-red-50 border-red-200 text-red-700 flex items-start gap-2">
          <span>🚫</span>
          <span className="text-sm"><strong>Blocked</strong> — {customer.blockedReason || 'No reason given'}</span>
        </div>
      )}

      {customer.stats.needsReview && (
        <div className="mb-5 px-4 py-3 rounded-lg border bg-amber-50 border-amber-200 text-amber-800 flex items-start gap-2">
          <span>⚠️</span>
          <span className="text-sm"><strong>Needs review.</strong> {Math.round((customer.stats.returnRate || 0) * 100)}% of delivered orders were returned.</span>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div className="flex items-start gap-4">
          <CustomerAvatar name={customer.name} size="lg" />
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="font-serif text-3xl font-semibold text-[#0F2A5C]">{customer.name}</h1>
              <CustomerStatusBadge status={statusBadge} size="md" />
              {customer.stats.needsReview && (
                <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">Needs review</span>
              )}
            </div>
            <p className="text-sm text-[#8A8F98]">
              {customer.phone} {customer.email && ` · ${customer.email}`} · Customer since {new Date(customer.createdAt).toLocaleDateString('en-GB')}
            </p>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((t) => (
                  <span key={t.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                    {t.tag}
                    <button onClick={() => handleDeleteTag(t.tag)} disabled={busy} className="hover:text-red-600">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <a href={`tel:+88${customer.phone}`} className="bg-white border border-[#E8EBF0] text-[#0F2A5C] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#F1F4F9] transition flex items-center gap-2">📞 Call</a>
          <a href={`https://wa.me/88${customer.phone}`} target="_blank" rel="noopener noreferrer" className="text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2" style={{ background: '#25D366' }}>💬 WhatsApp</a>
          {isBlocked ? (
            <button onClick={handleUnblock} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50">✓ Unblock</button>
          ) : (
            <button onClick={() => setShowBlock(true)} disabled={busy} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50">🚫 Block</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <StatCard label="Orders" value={String(customer.stats.orders)} tint="#0F2A5C" />
        <StatCard label="Total spent (net)" value={tk(customer.stats.totalSpent || 0)} tint="#059669" />
        <StatCard label="Average order" value={customer.stats.avgOrder ? tk(customer.stats.avgOrder) : '—'} tint="#7C3AED" />
        <StatCard label="Returns" value={`${customer.stats.returns}`} tint="#EA580C" />
      </div>

      <div className="bg-white rounded-lg border border-[#E8EBF0] mb-5 overflow-x-auto">
        <div className="flex min-w-max">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'orders', label: `Orders (${customer.orders.length})` },
            { key: 'returns', label: `Returns (${customer.stats.returns})` },
            { key: 'addresses', label: `Addresses (${addresses.length})` },
            { key: 'notes', label: `Notes (${customer.notes.length})` },
            { key: 'tags', label: 'Tags' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`px-4 py-3 text-sm font-medium transition border-b-2 ${tab === t.key ? 'text-[#0F2A5C] border-[#0F2A5C]' : 'text-[#8A8F98] border-transparent hover:text-[#0F2A5C]'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {tab === 'overview' && (
            <section className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5">
              <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">Recent orders</h2>
              {recentOrders.length === 0 ? (
                <p className="text-sm text-center py-6 text-[#8A8F98]">No orders yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F1F4F9] text-[#5A6270] text-xs uppercase">
                      <th className="text-left px-3 py-2 font-medium">Order</th>
                      <th className="text-left px-3 py-2 font-medium">Date</th>
                      <th className="text-right px-3 py-2 font-medium">Total</th>
                      <th className="text-center px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((o) => (
                      <tr key={o.id} className="border-t border-[#E8EBF0]">
                        <td className="px-3 py-3 font-mono text-xs font-semibold text-[#0F2A5C]">
                          <Link href={`/admin/orders/${o.id}`} className="hover:underline">{o.orderNumber}</Link>
                        </td>
                        <td className="px-3 py-3 text-xs text-[#8A8F98]">{new Date(o.createdAt).toLocaleDateString('en-GB')}</td>
                        <td className="px-3 py-3 text-right font-semibold text-[#0F2A5C]">{tk(o.total)}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_COLORS[o.status] || 'bg-gray-100'}`}>{o.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          )}

          {tab === 'orders' && (
            <section className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5">
              <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">All orders ({customer.orders.length})</h2>
              {customer.orders.length === 0 ? (
                <p className="text-sm text-[#8A8F98]">No orders yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F1F4F9] text-[#5A6270] text-xs uppercase">
                        <th className="text-left px-3 py-2">Order</th>
                        <th className="text-left px-3 py-2">Date</th>
                        <th className="text-right px-3 py-2">Total</th>
                        <th className="text-center px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customer.orders.map((o) => (
                        <tr key={o.id} className="border-t border-[#E8EBF0] hover:bg-[#F7F8FA]">
                          <td className="px-3 py-3 font-mono text-xs font-semibold text-[#0F2A5C]">
                            <Link href={`/admin/orders/${o.id}`} className="hover:underline">{o.orderNumber}</Link>
                          </td>
                          <td className="px-3 py-3 text-xs text-[#8A8F98]">{new Date(o.createdAt).toLocaleDateString('en-GB')}</td>
                          <td className="px-3 py-3 text-right font-semibold text-[#0F2A5C]">{tk(o.total)}</td>
                          <td className="px-3 py-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_COLORS[o.status] || 'bg-gray-100'}`}>{o.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {tab === 'addresses' && (
            <section className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5">
              <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">Addresses</h2>
              {addresses.length === 0 ? (
                <p className="text-sm text-[#8A8F98]">No saved addresses.</p>
              ) : (
                <div className="space-y-3">
                  {addresses.map((addr) => (
                    <div key={addr.id} className="p-4 border border-[#E8EBF0] rounded-lg bg-[#FAFBFC]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-[#0F2A5C]">{addr.district}, {addr.upazila}</span>
                        {addr.isDefault && (
                          <span className="text-[10px] bg-[#0F2A5C]/10 text-[#0F2A5C] px-2 py-0.5 rounded font-bold">DEFAULT</span>
                        )}
                      </div>
                      <p className="text-sm text-[#5A6270]">{addr.address}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === 'notes' && (
            <section className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-lg font-semibold text-[#0F2A5C]">Notes ({customer.notes.length})</h2>
                <button onClick={() => setShowNoteModal(true)} className="bg-[#F1F3F6] hover:bg-[#E3E6EB] text-[#0F2A5C] px-3 py-1.5 rounded-lg text-xs font-semibold">+ Add note</button>
              </div>
              {customer.notes.length === 0 ? (
                <p className="text-sm text-[#8A8F98]">No notes yet.</p>
              ) : (
                <div className="space-y-2">
                  {customer.notes.map((n) => (
                    <div key={n.id} className={`p-3 rounded-lg border ${n.pinned ? 'bg-amber-50 border-amber-200' : 'bg-[#F7F8FA] border-[#E8EBF0]'}`}>
                      {n.pinned && <div className="text-[10px] font-semibold text-amber-700 mb-1">📌 PINNED</div>}
                      <p className="text-sm text-[#0F2A5C]">{n.text}</p>
                      <p className="text-xs mt-1 text-[#8A8F98]">{formatDateTime(n.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === 'tags' && (
            <section className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-lg font-semibold text-[#0F2A5C]">Tags</h2>
                <button onClick={() => setShowTagModal(true)} className="bg-[#F1F3F6] hover:bg-[#E3E6EB] text-[#0F2A5C] px-3 py-1.5 rounded-lg text-xs font-semibold">+ Add tag</button>
              </div>
              {tags.length === 0 ? (
                <p className="text-sm text-[#8A8F98]">No tags yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <span key={t.id} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                      {t.tag}
                      <button onClick={() => handleDeleteTag(t.tag)} disabled={busy} className="hover:text-red-600 text-base leading-none">×</button>
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        <div className="lg:col-span-1 space-y-5">
          <section className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5">
            <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">Contact</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#8A8F98]">Phone</span>
                <a href={`tel:+88${customer.phone}`} className="font-mono text-[#0F2A5C] hover:underline">{customer.phone}</a>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A8F98]">Email</span>
                <span className="text-[#0F2A5C]">{customer.email || 'None'}</span>
              </div>
              <div className="flex flex-col gap-1 pt-2 border-t border-[#E8EBF0]">
                <span className="text-[#8A8F98]">Default address</span>
                <span className="text-[#0F2A5C] text-sm whitespace-normal break-words leading-snug">
                  {defaultAddr ? `${defaultAddr.address}, ${defaultAddr.upazila}, ${defaultAddr.district}` : 'None saved'}
                </span>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5">
            <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">Pinned note</h2>
            {pinnedNote ? <p className="text-sm text-[#0F2A5C]">{pinnedNote.text}</p> : <p className="text-sm text-[#8A8F98]">No pinned note.</p>}
          </section>
        </div>
      </div>

      {/* Modals */}
      {showBlock && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowBlock(false)}>
          <div className="bg-white rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-xl font-semibold text-[#0F2A5C] mb-2">Block customer?</h3>
            <p className="text-sm text-[#8A8F98] mb-4">This will block website orders and COD.</p>
            <textarea value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Reason..." rows={3} className="w-full bg-[#F1F3F6] rounded-lg px-3 py-2 text-sm mb-3" />
            <div className="flex gap-2">
              <button onClick={() => setShowBlock(false)} className="flex-1 border border-[#E8EBF0] rounded-lg py-2 text-sm">Cancel</button>
              <button onClick={handleBlock} disabled={busy || !blockReason.trim()} className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm">Block</button>
            </div>
          </div>
        </div>
      )}

      {showNoteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowNoteModal(false)}>
          <div className="bg-white rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-xl font-semibold text-[#0F2A5C] mb-2">Add note</h3>
            <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Note..." rows={4} autoFocus className="w-full bg-[#F1F3F6] rounded-lg px-3 py-2 text-sm mb-3" />
            <div className="flex gap-2">
              <button onClick={() => setShowNoteModal(false)} className="flex-1 border border-[#E8EBF0] rounded-lg py-2 text-sm">Cancel</button>
              <button onClick={handleAddNote} disabled={busy || !noteText.trim()} className="flex-1 bg-[#0F2A5C] text-white rounded-lg py-2 text-sm">Save</button>
            </div>
          </div>
        </div>
      )}

      {showTagModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowTagModal(false)}>
          <div className="bg-white rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-xl font-semibold text-[#0F2A5C] mb-2">Add tag</h3>
            <input value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="Tag name..." autoFocus className="w-full bg-[#F1F3F6] rounded-lg px-3 py-2 text-sm mb-3" />
            <div className="flex gap-2">
              <button onClick={() => setShowTagModal(false)} className="flex-1 border border-[#E8EBF0] rounded-lg py-2 text-sm">Cancel</button>
              <button onClick={handleAddTag} disabled={busy || !tagText.trim()} className="flex-1 bg-[#0F2A5C] text-white rounded-lg py-2 text-sm">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <div className="bg-white rounded-lg p-4 border border-[#E8EBF0] shadow-[0_2px_10px_rgba(15,42,92,0.06)]">
      <div className="text-xs text-[#8A8F98] mb-1">{label}</div>
      <div className="text-xl font-semibold" style={{ color: tint }}>{value}</div>
    </div>
  );
}