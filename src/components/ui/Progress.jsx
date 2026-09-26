import { cn } from '../../lib/cn'

const clamp01 = (v) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0))

// Thin accent bar. `value` is 0–1.
export function ProgressBar({ value, className, trackClassName, label }) {
  const pct = clamp01(value) * 100
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-fg/10', trackClassName, className)}
    >
      <div
        className="h-full rounded-full bg-accent-grad transition-[width] duration-700 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// Circular progress with content in the middle.
export function ProgressRing({ value, size = 64, stroke = 6, className, children, track = 'rgba(128,128,128,.2)' }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = clamp01(value)
  const id = `ring-${size}-${stroke}`
  return (
    <div className={cn('relative inline-grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--accent)" />
            <stop offset="1" stopColor="var(--accent-2)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${v * c} ${c}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}
