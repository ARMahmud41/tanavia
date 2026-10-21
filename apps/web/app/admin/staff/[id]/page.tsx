'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { tk } from '@/lib/format';

export default function StaffDetailPage() {
  const params = useParams();
  const router = useRouter();
  const staffId = params?.id as string;

  const [staff, setStaff] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Goal setting state
  const [salesGoal, setSalesGoal] = useState(0);
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  useEffect(() => {
    async function loadStaffData() {
      try {
        const token = getToken() || undefined;
        
        // 1. Fetch Staff Details
        const res = await api.get<any>(`/api/staff/${staffId}`, { token });
        setStaff(res.data);
        
        // 🎯 Set the goal from Database if exists
        if (res.data?.target) {
          setSalesGoal(res.data.target);
        }

        // 2. Fetch Orders handled by this staff
        const orderRes = await api.get<any>(`/api/orders?staffId=${staffId}&limit=10`, { token }).catch(() => ({ data: [] }));
        const orderItems = orderRes.data?.items || orderRes.data || [];
        setOrders(orderItems);

      } catch (err: any) {
        setError(err.message || 'Failed to load staff details');
      } finally {
        setLoading(false);
      }
    }
    if (staffId) loadStaffData();
  }, [staffId]);

  async function handleUpdateGoal() {
    setIsSavingGoal(true);
    try {
      const token = getToken() || undefined;
      // Update target in backend
      await api.patch(`/api/staff/${staffId}`, { target: salesGoal }, { token });
      alert('Sales goal updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update goal. Make sure API and Database are updated.');
    } finally {
      setIsSavingGoal(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (error || !staff) return <div className="p-8 text-center text-red-500">{error || 'Staff not found'}</div>;

  // Calculate real stats from fetched orders
  const totalSales = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const totalOrders = orders.length;

  return (
    <div className="p-8 bg-[#F7F8FA] min-h-screen">
      <div className="max-w-5xl mx-auto">
        <Link href="/admin/staff" className="text-sm text-gray-500 hover:text-wine mb-6 inline-block">← Back to Staff List</Link>
        
        {/* Header Profile */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#E8EBF0] mb-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-[#0F2A5C]/10 flex items-center justify-center text-3xl font-bold text-[#0F2A5C]">
              {staff.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#0F2A5C]">{staff.name}</h1>
              <p className="text-sm text-gray-500">{staff.email} • {staff.phone || 'No phone'}</p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700">{staff.role}</span>
            </div>
          </div>
          
          <button onClick={() => router.push('/admin/staff')} className="text-sm font-semibold text-gray-500 hover:text-wine">Close Profile</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Goals & Stats */}
          <div className="md:col-span-1 space-y-6">
            
            {/* Goal Setting Card */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#E8EBF0]">
              <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">🎯 Set Sales Goal</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Monthly Target (BDT)</label>
                  <input 
                    type="number" 
                    value={salesGoal}
                    onChange={(e) => setSalesGoal(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-wine outline-none" 
                  />
                </div>
                <button 
                  onClick={handleUpdateGoal} 
                  disabled={isSavingGoal}
                  className="w-full bg-[#0F2A5C] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#0A1F45] disabled:opacity-50"
                >
                  {isSavingGoal ? 'Saving...' : 'Update Target'}
                </button>
              </div>
            </div>

            {/* Performance Summary */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#E8EBF0]">
              <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">Performance</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Total Sales</span>
                  <span className="font-bold text-emerald-600">{tk(totalSales)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Orders Handled</span>
                  <span className="font-bold text-[#0F2A5C]">{totalOrders}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Current Shift</span>
                  <span className="font-bold text-amber-600">{staff.shiftStatus || 'Closed'}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Recent Orders */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#E8EBF0] min-h-full">
              <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">Recent Orders Handled</h2>
              
              {orders.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-3xl mb-2">📦</div>
                  <p>No orders handled yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="flex gap-4 border-l-2 border-[#0F2A5C]/20 pl-4 py-2 hover:bg-gray-50 transition">
                      <div className="text-xs text-gray-400 w-24 shrink-0 pt-1">
                        {new Date(order.createdAt).toLocaleDateString('en-GB')}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#0F2A5C]">
                          Order <Link href={`/admin/orders/${order.id}`} className="text-wine hover:underline">{order.orderNumber}</Link>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Amount: {tk(order.total)} • Status: <span className="font-semibold uppercase">{order.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}