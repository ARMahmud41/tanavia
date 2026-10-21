'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  active: boolean;
  createdAt: string;
}

export default function AdminStaffPage() {
  const router = useRouter();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Add Staff Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', phone: '', password: '', role: 'STAFF' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadStaff() {
    try {
      setLoading(true);
      const token = getToken() || undefined;
      const res = await api.get<any>('/api/staff', { token });
      const items = res.data?.items || res.data || [];
      setStaffList(items);
    } catch (err: any) {
      setError(err.message || 'Failed to load staff data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStaff();
  }, []);

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = getToken() || undefined;
      await api.post('/api/staff', newStaff, { token });
      setShowAddModal(false);
      setNewStaff({ name: '', email: '', phone: '', password: '', role: 'STAFF' });
      loadStaff(); // Reload list
    } catch (err: any) {
      alert(err.message || 'Failed to add staff. Email might be in use.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveStaff(id: string, name: string) {
    if (!confirm(`Are you sure you want to deactivate/remove ${name}?`)) return;
    try {
      const token = getToken() || undefined;
      await api.delete(`/api/staff/${id}`, { token });
      loadStaff();
    } catch (err: any) {
      alert(err.message || 'Failed to remove staff');
    }
  }

  return (
    <div className="p-8 bg-[#F7F8FA] min-h-screen relative">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#0F2A5C]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h1 className="font-serif text-3xl font-semibold text-[#0F2A5C] mb-0.5">Staff Management</h1>
            <p className="text-[#8A8F98] text-sm">Manage staff, track shifts, and view activity</p>
          </div>
        </div>
        
        {/* নতুন অ্যাড করা অংশ */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin/settings"
            className="bg-white border border-[#E8EBF0] text-[#0F2A5C] px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#F1F3F6] transition flex items-center gap-2"
          >
            ⚙️ Admin Settings
          </Link>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-[#0F2A5C] hover:bg-[#0A1F45] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-sm"
          >
            <span>+</span> Add New Staff
          </button>
        </div>
      </div>

      {error && <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => <div key={i} className="bg-white h-52 rounded-xl border border-[#E8EBF0] animate-pulse" />)}
        </div>
      ) : staffList.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E8EBF0] p-12 text-center shadow-sm">
          <div className="text-4xl mb-4">👥</div>
          <h3 className="text-lg font-semibold text-[#0F2A5C] mb-2">No Staff Members Found</h3>
          <button onClick={() => setShowAddModal(true)} className="mt-4 bg-[#0F2A5C] text-white px-5 py-2.5 rounded-lg text-sm font-semibold">+ Add Your First Staff</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staffList.map((member) => (
            <div key={member.id} className="bg-white rounded-xl shadow-sm border border-[#E8EBF0] p-6 hover:shadow-md transition relative group">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-full bg-[#0F2A5C]/10 flex items-center justify-center text-xl font-bold text-[#0F2A5C]">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0F2A5C]">{member.name}</h3>
                  <p className="text-xs text-[#8A8F98]">{member.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${member.role === 'ADMIN' ? 'bg-wine/10 text-wine' : 'bg-blue-50 text-blue-700'}`}>{member.role}</span>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${member.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{member.active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 border-t border-[#E8EBF0] pt-4">
                <div>
                  <div className="text-xs text-[#8A8F98] mb-1">Phone</div>
                  <div className="font-semibold text-[#0F2A5C] text-sm">{member.phone || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-[#8A8F98] mb-1">Joined</div>
                  <div className="font-semibold text-[#0F2A5C] text-sm">{new Date(member.createdAt).toLocaleDateString('en-GB')}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#E8EBF0]">
                <Link 
                  href={`/admin/staff/${member.id}`}
                  className="text-[#0F2A5C] hover:text-wine text-sm font-semibold flex items-center gap-1"
                >
                  View Activity →
                </Link>
                {member.role !== 'ADMIN' && (
                  <button 
                    onClick={() => handleRemoveStaff(member.id, member.name)}
                    className="text-red-500 hover:text-red-700 text-xs font-semibold bg-red-50 px-3 py-1.5 rounded transition"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD STAFF MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#E8EBF0] flex justify-between items-center bg-[#F7F8FA]">
              <h3 className="font-bold text-[#0F2A5C]">Add New Staff Member</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-red-500">✕</button>
            </div>
            <form onSubmit={handleAddStaff} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name</label>
                <input required type="text" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-wine outline-none" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                <input required type="email" value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-wine outline-none" placeholder="john@tanavia.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Phone (Optional)</label>
                <input type="text" value={newStaff.phone} onChange={e => setNewStaff({...newStaff, phone: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-wine outline-none" placeholder="017XXXXXXXX" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Password</label>
                <input required type="password" value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-wine outline-none" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Role</label>
                <select value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-wine outline-none">
                  <option value="STAFF">Staff</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 rounded-lg bg-[#0F2A5C] text-white text-sm font-semibold hover:bg-[#0A1F45] disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}