/**
 * Phone Normalization Utility
 *
 * Normalizes Bangladeshi phone numbers to a canonical format: 01XXXXXXXXX
 *
 * Accepts:
 *   01711000001        → 01711000001
 *   017 1100 0001      → 01711000001
 *   017-1100-0001      → 01711000001
 *   +8801711000001     → 01711000001
 *   8801711000001      → 01711000001
 *   +880 1711-000001   → 01711000001
 *
 * Returns null if invalid.
 */

const PHONE_REGEX = /^01[3-9]\d{8}$/;

export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;

  // 1. Strip all non-digit characters (spaces, dashes, parens, +)
  let p = String(input).replace(/[^\d]/g, '');

  // 2. Convert country code prefixes to local format
  if (p.startsWith('880')) {
    p = '0' + p.slice(3);
  } else if (p.startsWith('8801')) {
    // handled above but keep for clarity
    p = '0' + p.slice(3);
  }

  // 3. Handle case where input was '+880...' but slice removed the '0'
  //    (already handled in step 2)

  // 4. Validate final format
  if (!PHONE_REGEX.test(p)) return null;

  return p;
}

/**
 * Check if two phone numbers refer to the same customer.
 * Both are normalized first.
 */
export function isSamePhone(a: string | null, b: string | null): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  return na === nb;
}

/**
 * Format a normalized phone for display.
 * 01711000001 → 01711-000001
 */
export function formatPhone(phone: string | null): string {
  if (!phone) return '—';
  const p = normalizePhone(phone);
  if (!p) return phone;
  return `${p.slice(0, 5)}-${p.slice(5)}`;
}

/**
 * Build a WhatsApp link for a phone number.
 */
export function whatsappLink(phone: string, message?: string): string {
  const p = normalizePhone(phone);
  if (!p) return '#';
  const intl = '88' + p; // 8801711000001
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${intl}${text}`;
}

/**
 * Build a tel: link.
 */
export function telLink(phone: string): string {
  const p = normalizePhone(phone);
  if (!p) return '#';
  return `tel:+88${p}`;
}