'use client';

import { useState } from 'react';
import Image from 'next/image';
import { tk } from '@/lib/staff-pos';

export type PaymentMethod = 'CASH' | 'BKASH' | 'NAGAD' | 'ROCKET' | 'CARD';

interface Props {
  total: number;
  method: PaymentMethod;
  onMethodChange: (m: PaymentMethod) => void;
  amountReceived: string;
  onAmountReceivedChange: (a: string) => void;
  txId: string;
  onTxIdChange: (t: string) => void;
  senderNumber: string;
  onSenderNumberChange: (n: string) => void;
  smsDetected?: {
    provider: string;
    senderNumber: string;
    txId: string;
    amount: number;
  } | null;
  onDismissSms?: () => void;
  disabled?: boolean;
  onComplete: () => void;
  onClear: () => void;
  submitting?: boolean;
}

const METHODS: Array<{
  value: PaymentMethod;
  label: string;
  logo: string;
}> = [
  { value: 'CASH', label: 'Cash', logo: '/logos/cash.png' },
  { value: 'BKASH', label: 'bKash', logo: '/logos/bkash.png' },
  { value: 'NAGAD', label: 'Nagad', logo: '/logos/nagad.png' },
  { value: 'ROCKET', label: 'Rocket', logo: '/logos/rocket.png' },
  { value: 'CARD', label: 'Card', logo: '/logos/card.png' },
];

export function PaymentPanel({
  total,
  method,
  onMethodChange,
  amountReceived,
  onAmountReceivedChange,
  txId,
  onTxIdChange,
  senderNumber,
  onSenderNumberChange,
  smsDetected,
  onDismissSms,
  disabled,
  onComplete,
  onClear,
  submitting,
}: Props) {
  const received = Number(amountReceived) || 0;
  const change = received - total;
  const isCash = method === 'CASH';
  const isCard = method === 'CARD';
  const needsSender = method === 'BKASH' || method === 'NAGAD' || method === 'ROCKET';

  const hasEnoughCash = isCash && received >= total;
  const hasSenderNumber = /^01[3-9]\d{8}$/.test(senderNumber.trim());
  const hasTxId = txId.trim().length >= 4;

  const canComplete =
    !disabled &&
    !submitting &&
    (isCash
      ? hasEnoughCash
      : needsSender
      ? hasSenderNumber && hasTxId
      : true);

  function handleQuickCash(amount: number) {
    onAmountReceivedChange(String(amount));
  }

  const quickAmounts = [500, 1000, 2000, 5000];

  return (
    <div className="staff-card p-5 flex flex-col gap-4">
      {/* ============================================ */}
      {/* Payment method selector */}
      {/* ============================================ */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--staff-muted)] font-semibold mb-2">
          Payment method
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {METHODS.map((m) => {
            const active = method === m.value;
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => onMethodChange(m.value)}
                disabled={disabled}
                className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg border-2 transition cursor-pointer ${
                  active
                    ? 'border-[var(--staff-accent)] bg-[var(--staff-accent)]/10'
                    : 'border-[var(--staff-border)] hover:border-[var(--staff-accent)]/50'
                }`}
              >
                <div className="relative w-7 h-7 rounded bg-white border border-[var(--staff-border)] overflow-hidden flex-shrink-0">
                  <Image
                    src={m.logo}
                    alt={m.label}
                    fill
                    className="object-contain p-0.5"
                    sizes="28px"
                  />
                </div>
                <span
                  className={`text-[10px] font-semibold ${
                    active
                      ? 'text-[var(--staff-accent)]'
                      : 'text-[var(--staff-muted)]'
                  }`}
                >
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================ */}
      {/* CASH — Amount + Change */}
      {/* ============================================ */}
      {isCash && (
        <div>
          <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--staff-muted)] font-semibold mb-2">
            Amount received
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--staff-muted)] text-sm font-semibold">
              ৳
            </span>
            <input
              type="number"
              value={amountReceived}
              onChange={(e) => onAmountReceivedChange(e.target.value)}
              placeholder={String(total)}
              min={0}
              autoFocus
              className="w-full bg-[var(--staff-tile-bg)] border border-transparent rounded-lg pl-8 pr-4 py-3 text-lg font-bold text-[var(--staff-text)] placeholder:text-[var(--staff-muted)] focus:outline-none focus:bg-[var(--staff-card)] focus:border-[var(--staff-accent)] transition"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2">
            <button
              type="button"
              onClick={() => handleQuickCash(total)}
              className="px-2.5 py-1 rounded text-[11px] font-medium bg-[var(--staff-tile-bg)] text-[var(--staff-text)] hover:bg-[var(--staff-border)] transition"
            >
              Exact {tk(total)}
            </button>
            {quickAmounts
              .filter((a) => a >= total && a <= total * 5)
              .slice(0, 4)
              .map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => handleQuickCash(a)}
                  className="px-2.5 py-1 rounded text-[11px] font-medium bg-[var(--staff-tile-bg)] text-[var(--staff-text)] hover:bg-[var(--staff-border)] transition"
                >
                  {tk(a)}
                </button>
              ))}
          </div>

          <div className="flex items-center justify-between mt-3 px-1">
            <span className="text-sm text-[var(--staff-muted)]">Change</span>
            <span
              className={`font-serif text-xl font-bold ${
                change < 0
                  ? 'text-[var(--staff-danger)]'
                  : change > 0
                  ? 'text-[var(--staff-success)]'
                  : 'text-[var(--staff-text)]'
              }`}
            >
              {change < 0 ? `−${tk(Math.abs(change))}` : tk(change)}
            </span>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* bKash / Nagad / Rocket — Sender + TxID */}
      {/* ============================================ */}
      {needsSender && (
        <div className="space-y-3">
          {/* SMS auto-detect banner */}
          {smsDetected && (
            <div className="bg-[var(--staff-success)]/10 border border-[var(--staff-success)]/30 rounded-lg p-3 flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <div className="w-6 h-6 rounded-full bg-[var(--staff-success)] text-white flex items-center justify-center flex-shrink-0">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[var(--staff-success)] mb-0.5">
                    SMS detected — auto-filled
                  </div>
                  <div className="text-[11px] text-[var(--staff-text)]">
                    {smsDetected.provider} · {smsDetected.senderNumber} · ৳
                    {smsDetected.amount.toLocaleString()} · {smsDetected.txId}
                  </div>
                </div>
              </div>
              {onDismissSms && (
                <button
                  type="button"
                  onClick={onDismissSms}
                  className="text-[var(--staff-success)] hover:text-[var(--staff-danger)] transition flex-shrink-0"
                  aria-label="Dismiss"
                >
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
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Payment info banner */}
          <div className="bg-[var(--staff-accent)]/10 border border-[var(--staff-accent)]/20 rounded-lg p-3 flex items-start gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--staff-accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="flex-shrink-0 mt-0.5"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <div className="text-[11px] text-[var(--staff-text)] leading-relaxed">
              Ask customer to send{' '}
              <span className="font-bold">৳{total.toLocaleString()}</span> to
              our{' '}
              <span className="font-semibold">
                {method === 'BKASH' ? 'bKash' : method === 'NAGAD' ? 'Nagad' : 'Rocket'}
              </span>{' '}
              number{' '}
              <span className="font-mono font-bold text-[var(--staff-accent)]">
                01700 000000
              </span>
            </div>
          </div>

          {/* Sender number */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--staff-muted)] font-semibold mb-1.5 flex items-center justify-between">
              <span>Sender number *</span>
              {senderNumber && !hasSenderNumber && (
                <span className="text-[10px] text-[var(--staff-danger)] normal-case tracking-normal">
                  Invalid (11-digit 01XXXXXXXXX)
                </span>
              )}
            </div>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={11}
              value={senderNumber}
              onChange={(e) =>
                onSenderNumberChange(e.target.value.replace(/[^0-9]/g, ''))
              }
              placeholder="01XXXXXXXXX"
              autoFocus
              className="w-full bg-[var(--staff-tile-bg)] border border-transparent rounded-lg px-4 py-2.5 text-sm font-mono text-[var(--staff-text)] placeholder:text-[var(--staff-muted)] focus:outline-none focus:bg-[var(--staff-card)] focus:border-[var(--staff-accent)] transition"
            />
          </div>

          {/* TxID */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--staff-muted)] font-semibold mb-1.5 flex items-center justify-between">
              <span>Transaction ID *</span>
              {txId && !hasTxId && (
                <span className="text-[10px] text-[var(--staff-danger)] normal-case tracking-normal">
                  Min 4 characters
                </span>
              )}
            </div>
            <input
              type="text"
              value={txId}
              onChange={(e) => onTxIdChange(e.target.value.toUpperCase())}
              placeholder="e.g. 8H4K9L2M"
              maxLength={20}
              className="w-full bg-[var(--staff-tile-bg)] border border-transparent rounded-lg px-4 py-2.5 text-sm font-mono text-[var(--staff-text)] placeholder:text-[var(--staff-muted)] focus:outline-none focus:bg-[var(--staff-card)] focus:border-[var(--staff-accent)] transition"
            />
          </div>

          <div className="text-[10px] text-[var(--staff-muted)] flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            Verify the amount in your {method} app before completing.
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* CARD — Info only */}
      {/* ============================================ */}
      {isCard && (
        <div className="bg-[var(--staff-tile-bg)] rounded-lg p-3 text-xs text-[var(--staff-muted)] flex items-start gap-2">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="flex-shrink-0 mt-0.5"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <span>
            Customer pays via card machine. Confirm after swipe succeeds.
          </span>
        </div>
      )}

      {/* ============================================ */}
      {/* Actions */}
      {/* ============================================ */}
      <div className="flex flex-col gap-2 mt-auto">
        <button
          type="button"
          onClick={onComplete}
          disabled={!canComplete}
          className="w-full py-3.5 rounded-lg bg-[var(--staff-primary)] hover:opacity-95 text-white font-semibold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
              Complete sale
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onClear}
          disabled={disabled || submitting}
          className="w-full py-2.5 rounded-lg border border-[var(--staff-border)] text-[var(--staff-text)] text-sm font-medium hover:bg-[var(--staff-tile-bg)] transition disabled:opacity-40"
        >
          Clear cart
        </button>
      </div>
    </div>
  );
}