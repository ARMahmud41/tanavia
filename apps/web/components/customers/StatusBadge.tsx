'use client';

interface Props {
  status: string;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  NEW: {
    label: 'New',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  ACTIVE: {
    label: 'Active',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  REPEAT: {
    label: 'Repeat',
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
  },
  VIP: {
    label: 'VIP',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  AT_RISK: {
    label: 'At risk',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  BLOCKED: {
    label: 'Blocked',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
  },
  INACTIVE: {
    label: 'Inactive',
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    border: 'border-gray-300',
  },
};

export function CustomerStatusBadge({ status, size = 'sm' }: Props) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.INACTIVE;

  const padding = size === 'sm' ? 'px-2.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';

  return (
    <span
      className={`inline-block rounded-full font-semibold border ${config.bg} ${config.text} ${config.border} ${padding}`}
    >
      {config.label}
    </span>
  );
}