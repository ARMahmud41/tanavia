'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentUser, isAdmin, logout } from '@/lib/auth';

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/admin/products', label: 'Products', icon: '👕' },
  { href: '/admin/categories', label: 'Categories', icon: '📁' },
  { href: '/admin/orders', label: 'Orders', icon: '📦' },
  { href: '/admin/stock', label: 'Stock', icon: '📈' },
  { href: '/admin/inventory', label: 'Inventory', icon: '📦' },
  { href: '/admin/returns', label: 'Returns', icon: '↩️' },
  { href: '/admin/customers', label: 'Customers', icon: '👥' },
  { href: '/admin/barcodes', label: 'Barcodes', icon: '🏷️' },
  { href: '/admin/purchases', label: 'Purchases', icon: '🛍️' },
  { href: '/admin/suppliers', label: 'Suppliers', icon: '🏭' },
  { href: '/admin/staff', label: 'Staff', icon: '👥' },
  { href: '/admin/finance', label: 'Finance', icon: '💰' },
  { href: '/admin/courier', label: 'Couriers', icon: '🚚' },
  { href: '/admin/courier/settlements', label: 'COD Settlements', icon: '💰' },
  { href: '/admin/courier/returns', label: 'Courier Returns', icon: '↩️' },
  { href: '/admin/coupons', label: 'Coupons', icon: '🎟️' },
  { href: '/admin/banners', label: 'Banners', icon: '🖼️' },
  { href: '/admin/reviews', label: 'Reviews', icon: '⭐' },
  { href: '/admin/payments', label: 'Payments', icon: '💳' },
  { href: '/admin/drops', label: 'Drops', icon: '✨' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState('');

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (isLoginPage) {
      setReady(true);
      return;
    }

    const user = getCurrentUser();
    const token = localStorage.getItem('tanavia_access_token');

    // Token missing or user missing → redirect
    if (!user || !isAdmin() || !token) {
      localStorage.removeItem('tanavia_access_token');
      localStorage.removeItem('tanavia_user');
      router.push('/admin/login');
      return;
    }

    setUserName(user.name);
    setReady(true);
  }, [isLoginPage, pathname, router]);

  async function handleLogout() {
    await logout();
    router.push('/admin/login');
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
        <div className="text-[#8A8F98] text-sm">Verifying access...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#F7F8FA]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0F2A5C] text-white flex flex-col fixed h-screen">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <Link
            href="/admin/dashboard"
            className="font-serif text-2xl font-semibold text-white block"
          >
            TANAVIA
          </Link>
          <div className="text-[10px] text-white/50 tracking-widest uppercase mt-1">
            Admin Panel
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-lg mb-1 text-sm transition-all ${
                  active
                    ? 'bg-white text-[#0F2A5C] font-semibold shadow-[0_4px_14px_rgba(0,0,0,0.18)]'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                {/* Gold left indicator for active */}
                {active && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#F5B301] rounded-r" />
                )}
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-xs font-semibold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white/50 uppercase tracking-wide">
                Signed in as
              </div>
              <div className="text-sm text-white truncate font-medium">
                {userName}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-white/75 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition flex items-center gap-2"
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}