'use client';

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
}

export function RememberMe({ checked, onChange }: Props) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-line text-wine focus:ring-wine focus:ring-1 cursor-pointer"
      />
      <span className="text-ink">
        Save password for faster login next time
      </span>
    </label>
  );
}
