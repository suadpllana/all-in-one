import { cn } from '../../lib/cn'
import { PLATFORM_NAMES, PLATFORM_TAGS } from '../../lib/platforms'

// Compact platform tags for games (RAWG parent-platform slugs).
export default function Platforms({ platforms = [], max = 4, className, size = 'sm' }) {
  if (!platforms?.length) return null
  const shown = platforms.slice(0, max)
  const more = platforms.length - shown.length
  return (
    <div className={cn('flex shrink-0 items-center gap-1', className)}>
      {shown.map((p) => (
        <span
          key={p}
          title={PLATFORM_NAMES[p] || p}
          className={cn(
            'chamfer-sm bg-surface-2 font-mono font-bold tracking-tight text-fg-2 ring-1 ring-line',
            size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[11px]',
          )}
        >
          {PLATFORM_TAGS[p] || p.slice(0, 3).toUpperCase()}
        </span>
      ))}
      {more > 0 && <span className="text-[10px] font-bold text-muted">+{more}</span>}
    </div>
  )
}
