import { getStatusOptions } from '../../config/categories'
import { useItemActions } from '../../hooks/useItemActions'
import { cn } from '../../lib/cn'
import { statusIcon } from '../../lib/status'
import Icon from '../ui/Icon'

// One-tap status buttons overlaid on cards (hover on desktop, always on
// touch). Tapping the active one removes the item (with Undo in the toast).
export default function QuickActions({ item, className, compact = false, row = false }) {
  const a = useItemActions(item)
  const options = getStatusOptions(a.category)
  return (
    <div
      className={cn(
        'flex gap-1.5 transition-opacity duration-200',
        row ? 'flex-row' : 'flex-col',
        // Saved items keep their active button visible; the rest reveal on hover.
        'opacity-0 group-hover:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100',
        className,
      )}
    >
      {options.map((o) => {
        const active = a.status === o.status
        return (
          <button
            key={o.status}
            type="button"
            aria-pressed={active}
            aria-label={active ? `Remove from ${o.label}` : o.action}
            title={active ? `Remove from ${o.label}` : o.action}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              a.setStatus(o.status)
            }}
            className={cn(
              'grid place-items-center rounded-full shadow-lg transition-all duration-200 hover:scale-110 active:scale-95',
              compact ? 'h-7 w-7' : 'h-8 w-8',
              active
                ? 'bg-accent text-on-accent ring-2 ring-white/25'
                : 'bg-black/60 text-white ring-1 ring-white/25 backdrop-blur-md hover:bg-black/80',
            )}
          >
            <Icon name={statusIcon(item.category, o.status)} className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} strokeWidth={2.3} />
          </button>
        )
      })}
    </div>
  )
}

// Small persistent marker on a card showing it's in your library.
export function StatusBadge({ item, status, className }) {
  if (!status) return null
  return (
    <span
      className={cn(
        'grid h-6 w-6 place-items-center rounded-full bg-accent text-on-accent shadow-lg ring-2 ring-black/20',
        className,
      )}
      title={status}
    >
      <Icon name={statusIcon(item.category, status)} className="h-3.5 w-3.5" strokeWidth={2.5} />
    </span>
  )
}
