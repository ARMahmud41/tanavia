'use client';

import { useRef, KeyboardEvent } from 'react';

export interface SegmentedOption {
  value: string;
  label: string;
  count?: number;
  locked?: boolean;
  lockedHint?: string;
}

interface Props {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  ariaLabel?: string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  className = '',
  ariaLabel = 'Filter',
}: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, idx: number) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (idx + 1) % options.length;
      refs.current[next]?.focus();
      onChange(options[next].value);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (idx - 1 + options.length) % options.length;
      refs.current[prev]?.focus();
      onChange(options[prev].value);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(options[idx].value);
    }
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`inline-flex p-1 bg-[#F1F3F6] rounded-full gap-1 overflow-x-auto max-w-full ${className}`}
    >
      {options.map((opt, idx) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(el) => { refs.current[idx] = el; }}
            type="button"
            role="tab"
            aria-pressed={selected}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all focus:outline-none focus:ring-2 focus:ring-[#0F2A5C]/40 focus:ring-offset-1 ${
              selected
                ? 'bg-white text-[#0F2A5C] shadow-[0_2px_6px_rgba(15,42,92,0.10)] ring-1 ring-[#0F2A5C]/10'
                : 'text-[#5A6270] hover:text-[#0F2A5C] hover:bg-white/60'
            }`}
          >
            {opt.locked && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-70 flex-shrink-0"
                aria-hidden="true"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            )}
            <span>{opt.label}</span>
            {typeof opt.count === 'number' && (
              <span
                className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                  selected
                    ? 'bg-[#0F2A5C] text-white'
                    : 'bg-[#E3E6EB] text-[#5A6270]'
                }`}
              >
                {opt.count}
              </span>
            )}
            {opt.lockedHint && (
              <span className="text-[10px] font-normal text-[#8A8F98] hidden md:inline">
                {opt.lockedHint}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}