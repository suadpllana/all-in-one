import StatusDropdown from './StatusDropdown'
import { cn } from '../lib/cn'

// Poster card used in carousels and grids. Hover reveals the quick-add
// dropdown and lifts/scales the card.
//
// NOTE: this is a <div role="button"> rather than a <button> on purpose — it
// contains the StatusDropdown's own <button>s, and nesting interactive
// elements inside a <button> is invalid HTML (browsers swallow the inner
// clicks, which is why quick-add appeared to do nothing).
export default function MediaCard({ item, onOpen, className }) {
  function open() {
    onOpen(item)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          open()
        }
      }}
      className={cn(
        'media-card group relative block w-full cursor-pointer overflow-hidden rounded-card bg-[var(--color-surface)] text-left ring-1 ring-[var(--color-border)] transition-all duration-200 hover:z-10 hover:-translate-y-1 hover:ring-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        className,
      )}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[var(--color-surface-2)]">
        {item.posterUrl ? (
          <img
            src={item.posterUrl}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center p-3 text-center text-xs text-[var(--color-muted)]">
            {item.title}
          </div>
        )}

        {item.rating != null && (
          <span className="absolute left-1.5 top-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-bold text-white backdrop-blur">
            ★ {item.rating.toFixed(1)}
          </span>
        )}

        {/* Quick-add: always tappable on touch, revealed on hover for pointer */}
        <div className="absolute inset-x-1.5 bottom-1.5 opacity-100 transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100">
          <StatusDropdown item={item} />
        </div>
      </div>

      <div className="p-2">
        <p className="truncate text-sm font-semibold leading-tight">{item.title}</p>
        <p className="mt-0.5 text-xs text-[var(--color-muted)]">{item.year || '—'}</p>
      </div>
    </div>
  )
}
