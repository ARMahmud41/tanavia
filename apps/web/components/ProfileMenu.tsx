'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
}

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function load() {
      try {
        const raw = localStorage.getItem('tanavia_customer_user');
        if (raw) {
          setUser(JSON.parse(raw));
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    }

    load();

    // Listen for changes across tabs/windows + internal events
    window.addEventListener('storage', load);
    window.addEventListener('wishlist-change', load);

    return () => {
      window.removeEventListener('storage', load);
      window.removeEventListener('wishlist-change', load);
    };
  }, []);

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [open]);

  function handleLogout() {
    localStorage.removeItem('tanavia_customer_token');
    localStorage.removeItem('tanavia_customer_user');
    setUser(null);
    setOpen(false);
    window.location.href = '/';
  }

  return (
    <div className="relative" ref={ref}>
      {/* Profile trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex flex-col items-center justify-center px-2 py-1 text-xs text-ink hover:text-wine transition"
        aria-label="Profile"
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
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
        </svg>
        <span className="mt-0.5 font-medium">Profile</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-line rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.08)] overflow-hidden z-50">
          {/* Welcome / user info */}
          <div className="px-4 py-3 border-b border-line">
            {user ? (
              <>
                <p className="text-xs text-muted">Welcome back,</p>
                <p className="font-semibold text-ink truncate mt-0.5">
                  {user.name}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-ink mb-1">Welcome</p>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="text-sm font-bold text-wine hover:underline"
                >
                  Sign in
                </Link>
                <span className="text-sm text-muted mx-1.5">/</span>
                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  className="text-sm font-bold text-wine hover:underline"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          {/* Links */}
          <nav className="py-1">
            <MenuItem
              href="/account"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="2" width="16" height="20" rx="2" />
                  <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
                </svg>
              }
              label="My Account"
              onClick={() => setOpen(false)}
            />
            <MenuItem
              href="/track"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 16V8h12l4 5v3h-2" />
                  <circle cx="7" cy="18" r="2" />
                  <circle cx="17" cy="18" r="2" />
                </svg>
              }
              label="Track Order"
              onClick={() => setOpen(false)}
            />
            <MenuItem
              href="/wishlist"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              }
              label="My Wishlist"
              onClick={() => setOpen(false)}
            />
            <MenuItem
              href="/about"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
              }
              label="About Us"
              onClick={() => setOpen(false)}
            />
            <MenuItem
              href="/contact"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 7l9 6 9-6" />
                </svg>
              }
              label="Contact"
              onClick={() => setOpen(false)}
            />
          </nav>

          {/* Logout */}
          {user && (
            <div className="border-t border-line py-1">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-[#F7F8FA] hover:text-wine transition"
    >
      <span className="text-muted flex-shrink-0">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}