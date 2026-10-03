'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  onScan: (barcode: string) => void;
  loading?: boolean;
  lastScanned?: string | null;
}

export function BarcodeInput({ onScan, loading, lastScanned }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount + after every scan
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Clear success message after 2 seconds
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(''), 2000);
    return () => clearTimeout(timer);
  }, [success]);

  // Listen for lastScanned updates from parent
  useEffect(() => {
    if (!lastScanned) return;
    // Just trigger a subtle beep + success flash
    setSuccess(`Scanned: ${lastScanned}`);
  }, [lastScanned]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const code = value.trim();
    if (!code) return;

    onScan(code);
    setValue('');

    // Re-focus after submission
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function showError(msg: string) {
    setError(msg);
    setTimeout(() => setError(''), 3000);
  }

  // Expose a helper to parent via window event (optional)
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.error) showError(detail.error);
    }
    window.addEventListener('pos-scan-error', handler);
    return () => window.removeEventListener('pos-scan-error', handler);
  }, []);

  return (
    <div className="staff-card p-4">
      {/* Label */}
      <div className="flex items-center justify-between mb-3">
        <label className="text-xs font-semibold text-[var(--staff-muted)] tracking-wider uppercase">
          Scan barcode or search
        </label>
        {loading && (
          <span className="text-[10px] text-[var(--staff-accent)]">
            Searching...
          </span>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit}>
        <div className="relative">
          {/* Icon */}
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--staff-muted)]">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 5v14M8 5v14M12 5v14M16 5v14M20 5v14" />
            </svg>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Scan barcode, press Enter"
            autoComplete="off"
            autoFocus
            className="w-full bg-[var(--staff-tile-bg)] border border-transparent rounded-lg pl-11 pr-4 py-3.5 text-sm text-[var(--staff-text)] placeholder:text-[var(--staff-muted)] focus:outline-none focus:bg-[var(--staff-card)] focus:border-[var(--staff-accent)] transition"
          />
        </div>
      </form>

      {/* Status messages */}
      <div className="mt-2 min-h-[20px]">
        {error && (
          <div className="text-xs text-[var(--staff-danger)] flex items-center gap-1.5">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            {error}
          </div>
        )}

        {success && !error && (
          <div className="text-xs text-[var(--staff-success)] flex items-center gap-1.5">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
            {success}
          </div>
        )}

        {!error && !success && (
          <div className="text-[10px] text-[var(--staff-muted)]">
            Ready. Scan an item or tap a product below.
          </div>
        )}
      </div>
    </div>
  );
}