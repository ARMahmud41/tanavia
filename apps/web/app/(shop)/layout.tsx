'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { CartIcon } from '@/components/CartIcon';

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
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ============================================ */}
      {/* Header — sticky, mobile-first */}
      {/* ============================================ */}
      <header className="border-b border-line bg-white sticky top-0 z-50">
        <div className="container-wrap px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Hamburger (mobile only) */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="lg:hidden w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100"
            aria-label="Menu"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              {menuOpen ? (
                <>
                  <path d="M6 6l12 12M18 6L6 18" />
                </>
              ) : (
                <>
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </>
              )}
            </svg>
          </button>

          {/* Logo */}
          <Link
            href="/"
            className="font-serif text-xl sm:text-2xl font-semibold text-wine tracking-wide"
          >
            TANAVIA
          </Link>

          {/* Desktop nav (hidden on mobile) */}
          <nav className="hidden lg:flex gap-6 text-sm items-center">
            <Link href="/products" className="hover:text-wine transition">
              Shop
            </Link>
            <Link href="/track" className="hover:text-wine transition">
              Track Order
            </Link>
            <CartIcon />
            <Link href="/login" className="hover:text-wine transition">
              Login
            </Link>
          </nav>

          {/* Cart icon on mobile (right) */}
          <div className="lg:hidden flex items-center gap-1">
            <CartIcon />
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="lg:hidden border-t border-line bg-white">
            <nav className="container-wrap px-4 py-3 flex flex-col gap-1">
              <Link
                href="/products"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-3 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Shop
              </Link>
              <Link
                href="/track"
                onClick={() => setMenuOpen(false)}
                className="px-3 py-3 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Track Order
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
      <footer className="border-t border-line bg-white mt-12 hidden lg:block">
        <div className="container-wrap py-6 text-sm text-muted text-center">
          © 2026 TANAVIA. All rights reserved.
        </div>
      </footer>

      {/* ============================================ */}
      {/* Mobile bottom nav — always visible on phone */}
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