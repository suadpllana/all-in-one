import { getStatusOptions } from '../../config/categories'
import { useItemActions } from '../../hooks/useItemActions'
import { cn } from '../../lib/cn'
import { statusIcon } from '../../lib/status'
import Icon from '../ui/Icon'

// Segmented status picker for detail pages and heroes:
//   [Watchlist] [Watching] [Watched]  — in each world's own vocabulary.
// `glass` is for use over artwork.
export default function StatusControl({ item, glass = false, vertical = false, className, size = 'md' }) {
  const a = useItemActions(item)
  const options = getStatusOptions(a.category)
  return (
    <div
      role="group"
      aria-label="Library status"
      className={cn(
        'inline-flex max-w-full gap-1 rounded-ui p-1',
        vertical ? 'flex-col items-stretch' : 'no-scrollbar items-center overflow-x-auto',
        glass ? 'bg-black/45 ring-1 ring-white/15 backdrop-blur-md' : 'bg-surface-2 ring-1 ring-line',
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
            title={active ? `Remove from ${o.label}` : o.action}
            onClick={() => a.setStatus(o.status)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-ui font-semibold transition-all duration-200 active:scale-95',
              size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-10 px-4 text-sm',
              active
                ? 'bg-accent text-on-accent shadow-[0_8px_24px_-10px_var(--accent)]'
                : glass
                  ? 'text-white/80 hover:bg-white/10 hover:text-white'
                  : 'text-fg-2 hover:bg-surface hover:text-fg',
            )}
          >
            <Icon
              name={active ? 'check' : statusIcon(item.category, o.status)}
              className="h-4 w-4"
              strokeWidth={2.2}
            />
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// Heart toggle.
export function FavoriteButton({ item, glass = false, className }) {
  const a = useItemActions(item)
  return (
    <button
      type="button"
      onClick={a.toggleFavorite}
      aria-pressed={a.favorite}
      aria-label={a.favorite ? 'Remove from favorites' : 'Add to favorites'}
      title={a.favorite ? 'Remove from favorites' : 'Add to favorites'}
      className={cn(
        'grid h-12 w-12 shrink-0 place-items-center rounded-full transition-all duration-200 active:scale-90',
        a.favorite
          ? 'bg-rose-500/15 text-rose-500 ring-1 ring-rose-500/40'
          : glass
            ? 'bg-black/45 text-white ring-1 ring-white/15 backdrop-blur-md hover:text-rose-400'
            : 'bg-surface-2 text-fg-2 ring-1 ring-line hover:text-rose-500',
        className,
      )}
    >
      <Icon name={a.favorite ? 'heartFill' : 'heart'} className={cn('h-5 w-5', a.favorite && 'pop')} />
    </button>
  )
}
