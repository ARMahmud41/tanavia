'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { CartIcon } from '@/components/CartIcon';
import { ProfileMenu } from '@/components/ProfileMenu';
import { AnnouncementBar } from '@/components/AnnouncementBar';
import { ShopFooter } from '@/components/ShopFooter';
import { MegaMenu, type MegaMenuConfig } from '@/components/MegaMenu';

// Single-row nav items (desktop)
const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/products?category=men', label: 'Men' },
  { href: '/products?category=women', label: 'Women' },
  { href: '/products?category=kids', label: 'Kids' },
  { href: '/products?category=bags', label: 'Bags' },
  { href: '/products?category=shoes', label: 'Shoes' },
  { href: '/products?category=accessories', label: 'Accessories' },
  { href: '/products?offers=true', label: 'Offers' },
];

const MEGA_MENUS: Record<string, MegaMenuConfig> = {
  Men: {
    label: 'Men',
    href: '/products?category=men',
    accent: 'text-wine',
    underline: 'bg-wine',
    categorySlug: 'men',
    columns: [
      {
        title: 'Topwear',
        items: [
          { label: 'Half Sleeve T-shirt', href: '/products?category=men&q=half+sleeve' },
          { label: 'Full Sleeve T-shirt', href: '/products?category=men&q=full+sleeve' },
          { label: 'Polo T-shirt', href: '/products?category=men&q=polo' },
          { label: 'Shirt', href: '/products?category=men&q=shirt' },
          { label: 'Panjabi', href: '/products?category=men&q=panjabi' },
          { label: 'Hoodie', href: '/products?category=men&q=hoodie' },
          { label: 'Jacket', href: '/products?category=men&q=jacket' },
          { label: 'Sweatshirt', href: '/products?category=men&q=sweatshirt' },
        ],
      },
      {
        title: 'Bottomwear',
        items: [
          { label: 'Comfy Trouser', href: '/products?category=men&q=trouser' },
          { label: 'Sports Trouser', href: '/products?category=men&q=sports' },
          { label: 'Jeans', href: '/products?category=men&q=jeans' },
          { label: 'Joggers', href: '/products?category=men&q=joggers' },
          { label: 'Cargo Pants', href: '/products?category=men&q=cargo' },
          { label: 'Chino Pants', href: '/products?category=men&q=chino' },
          { label: 'Shorts', href: '/products?category=men&q=shorts' },
          { label: 'Pajama', href: '/products?category=men&q=pajama' },
        ],
      },
      {
        title: 'Accessories',
        items: [
          { label: 'Face Mask', href: '/products?category=men&q=mask' },
          { label: 'Underwear', href: '/products?category=men&q=underwear' },
          { label: 'Socks', href: '/products?category=men&q=socks' },
          { label: 'Wallet', href: '/products?category=men&q=wallet' },
          { label: 'Belt', href: '/products?category=men&q=belt' },
          { label: 'Cap', href: '/products?category=men&q=cap' },
        ],
      },
    ],
  },
  Women: {
    label: 'Women',
    href: '/products?category=women',
    accent: 'text-pink-600',
    underline: 'bg-pink-600',
    categorySlug: 'women',
    columns: [
      {
        title: 'Western & Ethnic',
        items: [
          { label: 'Kurti Tunic And Tops', href: '/products?category=women&q=kurti' },
          { label: 'T-Shirt', href: '/products?category=women&q=tshirt' },
          { label: 'Kurti', href: '/products?category=women&q=kurti' },
          { label: 'Comfy Trouser', href: '/products?category=women&q=trouser' },
          { label: '3pc Salwar Kameez', href: '/products?category=women&q=3pc' },
          { label: 'Co-ords', href: '/products?category=women&q=coord' },
          { label: '2pc Salwar Kameez', href: '/products?category=women&q=2pc' },
          { label: 'Pajamas', href: '/products?category=women&q=pajama' },
          { label: 'Palazzo', href: '/products?category=women&q=palazzo' },
          { label: 'Shrug', href: '/products?category=women&q=shrug' },
        ],
      },
    ],
  },
  Kids: {
    label: 'Kids',
    href: '/products?category=kids',
    accent: 'text-amber-500',
    underline: 'bg-amber-500',
    categorySlug: 'kids',
    columns: [
      {
        title: 'Boys',
        items: [
          { label: 'T-shirt', href: '/products?category=kids&q=boys+tshirt' },
          { label: 'Shorts', href: '/products?category=kids&q=boys+shorts' },
          { label: 'Polo T-shirt', href: '/products?category=kids&q=boys+polo' },
          { label: 'Full Sleeve T-shirt', href: '/products?category=kids&q=boys+full+sleeve' },
          { label: 'Panjabi', href: '/products?category=kids&q=boys+panjabi' },
          { label: 'Jacket', href: '/products?category=kids&q=boys+jacket' },
          { label: 'Trouser', href: '/products?category=kids&q=boys+trouser' },
          { label: 'Sweatshirt', href: '/products?category=kids&q=boys+sweatshirt' },
        ],
      },
      {
        title: 'Girls',
        items: [
          { label: 'T-shirt', href: '/products?category=kids&q=girls+tshirt' },
          { label: 'Shorts', href: '/products?category=kids&q=girls+shorts' },
          { label: 'Frock', href: '/products?category=kids&q=girls+frock' },
          { label: 'Trouser', href: '/products?category=kids&q=girls+trouser' },
          { label: 'Full Sleeve T-shirt', href: '/products?category=kids&q=girls+full+sleeve' },
          { label: 'Two Piece Set', href: '/products?category=kids&q=girls+two+piece' },
          { label: 'Hoodie', href: '/products?category=kids&q=girls+hoodie' },
          { label: 'Sweatshirt', href: '/products?category=kids&q=girls+sweatshirt' },
        ],
      },
    ],
  },
};

const MOBILE_NAV = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/products', label: 'Shop', icon: '🛍️' },
  { href: '/cart', label: 'Cart', icon: '🛒' },
  { href: '/login', label: 'Account', icon: '👤' },
];

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isSticky, setIsSticky] = useState(false);
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);

  // useRef instead of `let` — persists across renders, avoids stale closure issues
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function onScroll() {
      setIsSticky(window.scrollY > 8);
    }
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    };
  }, []);

  // Close mega menu on route change
  useEffect(() => {
    setHoveredMenu(null);
  }, [pathname]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    if (q) {
      router.push(`/products?q=${encodeURIComponent(q)}`);
      setMenuOpen(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ============================================ */}
      {/* Announcement marquee */}
      {/* ============================================ */}
      <AnnouncementBar />

      {/* ============================================ */}
      {/* Header — ALL IN ONE ROW */}
      {/* ============================================ */}
      <header
        className={`border-b border-line bg-white sticky top-0 z-50 transition-shadow ${
          isSticky ? 'shadow-[0_2px_12px_rgba(0,0,0,0.06)]' : ''
        }`}
      >
        <div className="w-full px-2 sm:px-4 lg:px-8 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3 lg:gap-5">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/tanavia-logo1.png"
              alt="TANAVIA"
              width={44}
              height={44}
              className="w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-full object-cover flex-shrink-0"
            />
            <span className="font-serif text-base sm:text-lg lg:text-2xl font-semibold text-wine tracking-wide leading-none whitespace-nowrap">
              TANAVIA
            </span>
          </Link>

          {/* Desktop nav links — with mega menu */}
          <nav className="hidden lg:flex items-center gap-4 xl:gap-6 text-sm flex-shrink-0">
            {NAV_LINKS.map((item) => {
              const isHome = item.href === '/';
              const isActive = isHome
                ? pathname === '/'
                : pathname.includes(item.href.split('?')[0]);
              const megaConfig = MEGA_MENUS[item.label];
              const isHovered = hoveredMenu === item.label;

              return (
                <div
                  key={item.href}
                  className="relative"
                  onMouseEnter={() => {
                    if (megaConfig) {
                      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                      setHoveredMenu(item.label);
                    }
                  }}
                  onMouseLeave={() => {
                    if (megaConfig) {
                      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                      hoverTimeout.current = setTimeout(
                        () => setHoveredMenu(null),
                        120
                      );
                    }
                  }}
                >
                  <Link
                    href={item.href}
                    className={`relative py-1 font-medium transition whitespace-nowrap ${
                      isActive || isHovered
                        ? 'text-wine'
                        : 'text-ink hover:text-wine'
                    }`}
                  >
                    {item.label}
                    {(isActive || isHovered) && (
                      <span
                        className={`absolute left-0 right-0 -bottom-1 h-0.5 rounded ${
                          megaConfig?.underline || 'bg-wine'
                        }`}
                      />
                    )}
                  </Link>
                </div>
              );
            })}
          </nav>

          {/* Search — VISIBLE ON ALL DEVICES, fills middle space */}
          <form
            onSubmit={handleSearch}
            className="flex flex-1 min-w-0 max-w-md ml-auto lg:ml-0"
          >
            <div className="flex w-full rounded-full overflow-hidden border border-line focus-within:border-wine transition bg-white">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="flex-1 px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm outline-none bg-transparent min-w-0"
              />
              <button
                type="submit"
                className="bg-wine text-white text-xs sm:text-sm font-semibold px-2.5 sm:px-5 hover:bg-wine/90 transition whitespace-nowrap flex items-center justify-center"
                aria-label="Search"
              >
                {/* Icon on mobile, text on desktop */}
                <svg
                  className="sm:hidden"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
                <span className="hidden sm:inline">Search</span>
              </button>
            </div>
          </form>

          {/* Desktop right actions — hidden on mobile */}
          <div className="hidden lg:flex items-center gap-3 xl:gap-4 text-sm flex-shrink-0">
            <Link
              href="/track"
              className="flex flex-col items-center justify-center px-2 py-1 text-xs text-ink hover:text-wine transition"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 16V8h12l4 5v3h-2" />
                <circle cx="7" cy="18" r="2" />
                <circle cx="17" cy="18" r="2" />
              </svg>
              <span className="mt-0.5 font-medium">Track</span>
            </Link>

            <Link
              href="/wishlist"
              className="flex flex-col items-center justify-center px-2 py-1 text-xs text-ink hover:text-wine transition"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span className="mt-0.5 font-medium">Wishlist</span>
            </Link>

            <ProfileMenu />

            <div className="relative flex flex-col items-center justify-center px-2 py-1 text-xs">
              <CartIcon />
            </div>
          </div>

          {/* Mobile right actions — cart + hamburger */}
          <div className="lg:hidden flex items-center gap-0.5 flex-shrink-0">
            <CartIcon />
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100"
              aria-label="Menu"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                {menuOpen ? (
                  <path d="M6 6l12 12M18 6L6 18" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mega menu — Desktop only */}
        {hoveredMenu && MEGA_MENUS[hoveredMenu] && (
          <MegaMenu
            config={MEGA_MENUS[hoveredMenu]}
            onClose={() => setHoveredMenu(null)}
          />
        )}

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="lg:hidden border-t border-line bg-white">
            <nav className="px-4 py-3 flex flex-col gap-1 max-h-[70vh] overflow-y-auto">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-3 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  {item.label}
                </Link>
              ))}
              <div className="border-t border-line my-1" />
              <Link
                href="/track"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-3 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Track Order
              </Link>
              <Link
                href="/wishlist"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-3 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Wishlist
              </Link>
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-3 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Login
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* ============================================ */}
      {/* Main content */}
      {/* ============================================ */}
      <main className="flex-1 pb-20 lg:pb-0">{children}</main>

      {/* ============================================ */}
      {/* Footer */}
      {/* ============================================ */}
      <ShopFooter />

      {/* ============================================ */}
      {/* Mobile bottom nav */}
      {/* ============================================ */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-line shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-4">
          {MOBILE_NAV.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-2.5 gap-0.5 transition ${
                  isActive ? 'text-wine' : 'text-gray-500'
                }`}
              >
                <span className="text-xl leading-none">{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}