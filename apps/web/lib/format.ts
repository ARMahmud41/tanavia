// ============================================
// TANAVIA — Formatting Utilities
// ============================================

export function tk(n: number | string | null | undefined): string {
  const num = Number(n || 0);
  return '৳' + num.toLocaleString('en-BD', { maximumFractionDigits: 0 });
}

export function sellPrice(price: number | string, discount: number): number {
  const p = Number(price);
  return Math.round(p * (1 - discount / 100));
}

export function formatDate(iso: string | Date): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string | Date): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    }) +
    ' ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
}

export function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + '…';
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}