'use client';

interface Props {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const COLORS = [
  '#2563EB', // blue
  '#7C3AED', // purple
  '#DB2777', // pink
  '#EA580C', // orange
  '#059669', // green
  '#0891B2', // cyan
  '#4F46E5', // indigo
  '#DC2626', // red
];

function getColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function CustomerAvatar({ name, size = 'md' }: Props) {
  const initial = (name || '?').charAt(0).toUpperCase();
  const bg = getColor(name || '?');

  const sizeClass = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-14 h-14 text-xl',
  }[size];

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}
      style={{ background: bg }}
    >
      {initial}
    </div>
  );
}