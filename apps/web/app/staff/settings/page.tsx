'use client';

export default function Page() {
  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen" style={{ background: 'var(--staff-bg)' }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--staff-primary)' }}>
          <span className="text-white font-bold text-lg">??</span>
        </div>
        <div>
          <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-semibold" style={{ color: 'var(--staff-text)' }}>Settings</h1>
          <p className="text-xs sm:text-sm" style={{ color: 'var(--staff-muted)' }}>Shop preferences</p>
        </div>
      </div>
      <div className="p-16 text-center rounded-lg border" style={{ background: 'var(--staff-card)', borderColor: 'var(--staff-border)' }}>
        <div className="text-4xl mb-3">??</div>
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--staff-text)' }}>Coming soon</p>
        <p className="text-xs" style={{ color: 'var(--staff-muted)' }}>This feature is under development.</p>
      </div>
    </div>
  );
}