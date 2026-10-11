'use client';

import { useState } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  autoComplete?: string;
  showHints?: boolean;
}

export function PasswordInput({
  value,
  onChange,
  placeholder = '••••••••',
  label,
  required,
  autoComplete = 'new-password',
  showHints = false,
}: Props) {
  const [show, setShow] = useState(false);

  // Strength checks
  const hasLength = value.length >= 10;
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);

  return (
    <div>
      {label && (
        <label className="block text-xs uppercase tracking-wide text-muted mb-1.5 font-semibold">
          {label}
          {required && ' *'}
        </label>
      )}

      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className="w-full rounded-lg border border-line bg-[#F7F8FA] pl-4 pr-12 py-3 text-sm outline-none focus:border-wine focus:bg-white transition"
        />
        {/* Show/Hide toggle */}
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-muted hover:text-wine transition"
          aria-label={show ? 'Hide password' : 'Show password'}
          title={show ? 'Hide password' : 'Show password'}
        >
          {show ? (
            // Eye-off icon
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
              <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            // Eye icon
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
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>

      {/* Strength hints */}
      {showHints && value.length > 0 && (
        <div className="mt-2 space-y-1 text-[10px]">
          <Hint ok={hasLength} text="At least 10 characters" />
          <Hint ok={hasUpper} text="One uppercase letter (A-Z)" />
          <Hint ok={hasLower} text="One lowercase letter (a-z)" />
          <Hint ok={hasNumber} text="One number (0-9)" />
          <Hint ok={hasSpecial} text="One special character (!@#$...)" />
        </div>
      )}
    </div>
  );
}

function Hint({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div
      className={`flex items-center gap-1.5 ${
        ok ? 'text-emerald-600' : 'text-muted'
      }`}
    >
      <span
        className={`inline-block w-3 h-3 rounded-full flex-shrink-0 flex items-center justify-center text-[8px] font-bold ${
          ok ? 'bg-emerald-500 text-white' : 'bg-[#E8EBF0] text-muted'
        }`}
      >
        {ok ? '✓' : ''}
      </span>
      <span>{text}</span>
    </div>
  );
}