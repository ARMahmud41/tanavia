'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  emptyMessage?: string;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  className = '',
  emptyMessage = 'No matches found',
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filtered options
  const filtered = query.trim()
    ? options.filter((o) =>
        o.toLowerCase().includes(query.trim().toLowerCase())
      )
    : options;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery('');
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Focus input when opening
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Scroll to highlighted option
  useEffect(() => {
    if (open && listRef.current) {
      const item = listRef.current.children[highlight] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlight, open]);

  function selectOption(option: string) {
    onChange(option);
    setOpen(false);
    setQuery('');
    setHighlight(0);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlight]) {
        selectOption(filtered[highlight]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setQuery('');
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        className={`w-full bg-[#F1F3F6] border border-transparent rounded-lg px-4 py-3 text-sm cursor-pointer transition flex items-center justify-between gap-2 ${
          disabled
            ? 'opacity-60 cursor-not-allowed'
            : 'hover:border-[#0F2A5C]/30 focus:outline-none focus:bg-white focus:border-[#0F2A5C]'
        } ${open ? 'bg-white border-[#0F2A5C]' : ''}`}
      >
        <span
          className={`truncate ${
            value ? 'text-ink' : 'text-[#8A8F98]'
          }`}
        >
          {value || placeholder}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-[#8A8F98] flex-shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-[#E3E6EB] rounded-lg shadow-[0_10px_30px_rgba(15,42,92,0.15)] overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-[#F1F3F6]">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8F98]"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlight(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search..."
                className="w-full bg-[#F1F3F6] rounded-md pl-9 pr-3 py-2 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-[#0F2A5C]"
              />
            </div>
          </div>

          {/* Options list */}
          <ul
            ref={listRef}
            role="listbox"
            className="max-h-64 overflow-y-auto py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-[#8A8F98] text-center">
                {emptyMessage}
              </li>
            ) : (
              filtered.map((opt, idx) => {
                const selected = opt === value;
                const isHighlighted = idx === highlight;
                return (
                  <li
                    key={opt}
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectOption(opt);
                    }}
                    className={`px-4 py-2 text-sm cursor-pointer flex items-center justify-between transition ${
                      isHighlighted
                        ? 'bg-[#0F2A5C] text-white'
                        : selected
                        ? 'bg-[#0F2A5C]/5 text-[#0F2A5C] font-medium'
                        : 'text-ink hover:bg-[#F1F3F6]'
                    }`}
                  >
                    <span className="truncate">{opt}</span>
                    {selected && !isHighlighted && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="flex-shrink-0 text-[#0F2A5C]"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}