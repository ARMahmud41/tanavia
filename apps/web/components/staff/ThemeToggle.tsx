'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('staff-theme') as 'light' | 'dark' | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.classList.toggle('dark', saved === 'dark');
    }
  }, []);

  function toggle() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('staff-theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  }

  if (!mounted) {
    return (
      <button
        className="px-3 py-1.5 rounded-lg border border-[var(--staff-border)] text-xs text-[var(--staff-muted)]"
        disabled
      >
        Display mode
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--staff-border)] text-xs font-medium text-[var(--staff-text)] hover:bg-[var(--staff-card-hover)] transition"
      title={theme === 'light' ? 'Switch to dark' : 'Switch to light'}
    >
      <span className="text-base">{theme === 'light' ? '☀️' : '🌙'}</span>
      <span>Display mode</span>
    </button>
  );
}