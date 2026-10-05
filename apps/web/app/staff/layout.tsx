'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentUser, logout } from '@/lib/auth';

// ============================================
// MENU STRUCTURE — All visible, no accordion
// ============================================
interface MenuItem {
  href: string;
  label: string;
  badge?: number;
  badgeColor?: 'red' | 'amber';
  roles: Array<'ADMIN' | 'STAFF'>;
}

interface MenuGroup {
  id: string;
  label: string;
  items: MenuItem[];
}

const MENU_GROUPS: MenuGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      {
        href: '/staff',
        label: 'Dashboard',
        roles: ['ADMIN', 'STAFF'],
      },
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    items: [
      {
        href: '/staff/orders',
        label: 'Orders',
        badge: 12,
        badgeColor: 'red',
        roles: ['ADMIN', 'STAFF'],
      },
      {
        href: '/staff/pos',
        label: 'POS sales',
        roles: ['ADMIN', 'STAFF'],
      },
      {
        href: '/staff/returns',
        label: 'Returns & refunds',
        badge: 2,
        badgeColor: 'red',
        roles: ['ADMIN', 'STAFF'],
      },
      {
        href: '/staff/customers',
        label: 'Customers',
        roles: ['ADMIN', 'STAFF'],
      },
    ],
  },
  {
    id: 'catalog',
    label: 'Catalog',
    items: [
      {
        href: '/staff/products',
        label: 'Products',
        roles: ['ADMIN', 'STAFF'],
      },
      {
        href: '/staff/inventory',
        label: 'Inventory',
        badge: 4,
        badgeColor: 'amber',
        roles: ['ADMIN', 'STAFF'],
      },
      {
        href: '/staff/barcodes',
        label: 'Barcode labels',
        roles: ['ADMIN', 'STAFF'],
      },
      {
        href: '/staff/purchases',
        label: 'Purchases',
        roles: ['ADMIN', 'STAFF'],
      },
    ],
  },
  {
    id: 'shipping',
    label: 'Shipping',
    items: [
      {
        href: '/staff/couriers',
        label: 'Couriers',
        roles: ['ADMIN', 'STAFF'],
      },
      {
        href: '/staff/shipping-labels',
        label: 'Shipping labels',
        roles: ['ADMIN', 'STAFF'],
      },
      {
        href: '/staff/cod-settlement',
        label: 'COD settlement',
        roles: ['ADMIN', 'STAFF'],
      },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    items: [
      {
        href: '/staff/coupons',
        label: 'Coupons',
        roles: ['ADMIN', 'STAFF'],
      },
      {
        href: '/staff/banners',
        label: 'Banners',
        roles: ['ADMIN', 'STAFF'],
      },
      {
        href: '/staff/reviews',
        label: 'Reviews',
        roles: ['ADMIN', 'STAFF'],
      },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      {
        href: '/staff/payments',
        label: 'Payments',
        roles: ['ADMIN', 'STAFF'],
      },
      {
        href: '/staff/expenses',
        label: 'Expenses',
        roles: ['ADMIN', 'STAFF'],
      },
      {
        href: '/staff/reports',
        label: 'Reports',
        roles: ['ADMIN', 'STAFF'],
      },
    ],
  },
  {
    id: 'team',
    label: 'Team',
    items: [
      {
        href: '/staff/staff',
        label: 'Staff & roles',
        roles: ['ADMIN'],
      },
      {
        href: '/staff/shifts',
        label: 'Shifts',
        roles: ['ADMIN', 'STAFF'],
      },
      {
        href: '/staff/audit',
        label: 'Audit log',
        roles: ['ADMIN'],
      },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      {
        href: '/staff/settings',
        label: 'Settings',
        roles: ['ADMIN'],
      },
      {
        href: '/staff/notifications',
        label: 'Notifications',
        roles: ['ADMIN', 'STAFF'],
      },
      {
        href: '/staff/backup',
        label: 'Backup',
        roles: ['ADMIN'],
      },
    ],
  },
];

// ============================================
// Icons
// ============================================
function Icon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    dashboard: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" />
        <rect x="14" y="3" width="7" height="5" />
        <rect x="14" y="12" width="7" height="9" />
        <rect x="3" y="16" width="7" height="5" />
      </svg>
    ),
    orders: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 7h14l-1 12H6L5 7z" />
        <path d="M9 7V5a3 3 0 0 1 6 0v2" />
      </svg>
    ),
    pos: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3h2l2 12h11l2-8H6" />
        <circle cx="9" cy="19" r="1.5" />
        <circle cx="17" cy="19" r="1.5" />
      </svg>
    ),
    returns: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
        <path d="M3 21v-5h5" />
      </svg>
    ),
    customers: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-1a6 6 0 0 1 12 0v1" />
        <path d="M17 4a3 3 0 0 1 0 6" />
        <path d="M21 21v-1a5 5 0 0 0-4-5" />
      </svg>
    ),
    products: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
        <path d="M3.3 8L12 13l8.7-5" />
        <path d="M12 13v9" />
      </svg>
    ),
    categories: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
    inventory: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="6" width="18" height="14" rx="1" />
        <path d="M3 10h18" />
        <path d="M8 6V4h8v2" />
      </svg>
    ),
    barcode: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5v14M8 5v14M12 5v14M16 5v14M20 5v14" />
      </svg>
    ),
    purchases: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18l-2 9H5L3 6z" />
        <path d="M8 6V4h8v2" />
        <circle cx="8" cy="19" r="1.5" />
        <circle cx="16" cy="19" r="1.5" />
      </svg>
    ),
    couriers: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 16V8h12l4 5v3h-2" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="17" cy="18" r="2" />
        <path d="M3 16h2M11 16h4" />
      </svg>
    ),
    labels: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="1" />
        <path d="M7 8h10M7 12h10M7 16h6" />
      </svg>
    ),
    cod: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v10M9 9h5a2 2 0 1 0 0 4h-4a2 2 0 1 0 0 4h5" />
      </svg>
    ),
    coupons: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 8V6h18v2a2 2 0 0 0 0 4v6H3v-6a2 2 0 0 0 0-4z" />
        <path d="M13 6v12" strokeDasharray="2 2" />
      </svg>
    ),
    banners: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="1" />
        <path d="M3 15l5-5 4 4 3-3 6 6" />
      </svg>
    ),
    reviews: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l3 6 6 .9-4.5 4.4 1 6.2L12 17.5 6.5 20.5l1-6.2L3 9.9 9 9z" />
      </svg>
    ),
    payments: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18" />
      </svg>
    ),
    expenses: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16v16H4z" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    ),
    reports: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4v16h16" />
        <path d="M7 15l4-4 3 3 5-6" />
      </svg>
    ),
    staff: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20v-1a5 5 0 0 1 10 0v1" />
        <circle cx="17" cy="9" r="2" />
        <path d="M15 20v-1a4 4 0 0 1 6-3.5" />
      </svg>
    ),
    shifts: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
    audit: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3h9l5 5v13H6z" />
        <path d="M14 3v6h6M9 13h6M9 17h4" />
      </svg>
    ),
    settings: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </svg>
    ),
    notifications: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 1 1 12 0v4l2 4H4l2-4V8z" />
        <path d="M10 19a2 2 0 0 0 4 0" />
      </svg>
    ),
    backup: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="6" rx="8" ry="3" />
        <path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
        <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
      </svg>
    ),
  };
  return <>{icons[name] || icons.dashboard}</>;
}

function getIconKey(href: string): string {
  if (href === '/staff') return 'dashboard';
  if (href.includes('orders')) return 'orders';
  if (href.includes('pos')) return 'pos';
  if (href.includes('returns')) return 'returns';
  if (href.includes('customers')) return 'customers';
  if (href.includes('products')) return 'products';
  if (href.includes('categories')) return 'categories';
  if (href.includes('inventory')) return 'inventory';
  if (href.includes('barcodes')) return 'barcode';
  if (href.includes('purchases')) return 'purchases';
  if (href.includes('couriers')) return 'couriers';
  if (href.includes('shipping-labels')) return 'labels';
  if (href.includes('cod-settlement')) return 'cod';
  if (href.includes('coupons')) return 'coupons';
  if (href.includes('banners')) return 'banners';
  if (href.includes('reviews')) return 'reviews';
  if (href.includes('payments')) return 'payments';
  if (href.includes('expenses')) return 'expenses';
  if (href.includes('reports')) return 'reports';
  if (href.includes('staff')) return 'staff';
  if (href.includes('shifts')) return 'shifts';
  if (href.includes('audit')) return 'audit';
  if (href.includes('settings')) return 'settings';
  if (href.includes('notifications')) return 'notifications';
  if (href.includes('backup')) return 'backup';
  return 'dashboard';
}

function filterMenuByRole(groups: MenuGroup[], role: string): MenuGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.roles.includes(role as 'ADMIN' | 'STAFF')
      ),
    }))
    .filter((group) => group.items.length > 0);
}

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState<string>('STAFF');

  const isLoginPage = pathname === '/staff/login';

  useEffect(() => {
    if (isLoginPage) {
      setReady(true);
      return;
    }

    const user = getCurrentUser();
    const token = localStorage.getItem('tanavia_access_token');

    if (
      !user ||
      !token ||
      (user.role !== 'STAFF' && user.role !== 'ADMIN')
    ) {
      localStorage.removeItem('tanavia_access_token');
      localStorage.removeItem('tanavia_user');
      router.push('/staff/login');
      return;
    }

    setUserName(user.name);
    setUserRole(user.role);
    setReady(true);
  }, [isLoginPage, pathname, router]);

  async function handleLogout() {
    await logout();
    router.push('/staff/login');
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9]">
        <div className="text-[#5F7083] text-sm">Verifying access...</div>
      </div>
    );
  }

  const visibleGroups = filterMenuByRole(MENU_GROUPS, userRole);

  return (
    <div className="staff-shell min-h-screen flex">
      {/* Sidebar — Always fully expanded */}
      <aside className="w-[260px] bg-[#0B1620] dark:bg-[#060F18] text-[#E9EFF5] flex flex-col fixed h-screen border-r border-[#1F3244]">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <Link href="/staff" className="flex items-center gap-3 group">
            {/* Logo */}
            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-[#0F2942] flex items-center justify-center flex-shrink-0 ring-1 ring-white/10">
              <Image
                src="/logos/tanavia-logo.png"
                alt="TANAVIA"
                fill
                className="object-contain p-0.5"
                priority
              />
            </div>
            {/* Text */}
            <div className="min-w-0">
              <div className="font-serif text-lg font-semibold text-[#F6F9FC] block tracking-[0.12em] leading-none">
                TANAVIA
              </div>
              <div className="text-[9px] text-[#7E9AB8] tracking-[0.18em] uppercase mt-1 font-medium">
                {userRole === 'ADMIN' ? 'Admin Panel' : 'Staff Panel'}
              </div>
            </div>
          </Link>
        </div>

        {/* Nav — All groups visible, no collapse */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 staff-scroll">
          {visibleGroups.map((group) => (
            <div key={group.id} className="mb-4">
              {/* Group label */}
              <div className="px-3 py-1.5 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.18em] text-[#7E9AB8] font-bold">
                  {group.label}
                </span>
                <span className="text-[10px] text-[#4A6B8A] font-medium">
                  {group.items.length}
                </span>
              </div>

              {/* Group items — always visible */}
              <div className="space-y-0.5 mt-1">
                {group.items.map((item) => {
                  const active =
                    item.href === '/staff'
                      ? pathname === '/staff'
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`relative flex items-center gap-3 pl-3 pr-2 py-2 rounded-md text-[13.5px] transition-all ${
                        active
                          ? 'bg-[#2F7D7A] text-[#F6F9FC] font-semibold shadow-[0_2px_8px_rgba(47,125,122,0.35)]'
                          : 'text-[#B8C7D9] hover:bg-white/[0.06] hover:text-[#E9EFF5]'
                      }`}
                      title={item.label}
                    >
                      <span
                        className={`flex-shrink-0 ${
                          active ? 'opacity-100' : 'opacity-75'
                        }`}
                      >
                        <Icon name={getIconKey(item.href)} />
                      </span>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && item.badge > 0 && (
                        <span
                          className={`text-white text-[10px] font-bold rounded-full min-w-[20px] h-[20px] px-1.5 flex items-center justify-center flex-shrink-0 ${
                            active
                              ? 'bg-white/30'
                              : item.badgeColor === 'amber'
                              ? 'bg-[#D97706]'
                              : 'bg-[#DC2626]'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="w-9 h-9 rounded-full bg-[#2F7D7A] flex items-center justify-center text-sm font-bold text-[#F6F9FC] flex-shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-[#8FA5BC] uppercase tracking-wide">
                Signed in as
              </div>
              <div className="text-[13px] text-[#E9EFF5] truncate font-semibold">
                {userName}
              </div>
              <div className="text-[10px] text-[#7AC5B8] font-bold tracking-wider">
                {userRole}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left text-[13px] text-[#B8C7D9] hover:text-[#F6F9FC] hover:bg-white/10 px-3 py-2 rounded-md transition flex items-center gap-2"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-[260px] min-h-screen staff-shell">
        {children}
      </main>
    </div>
  );
}