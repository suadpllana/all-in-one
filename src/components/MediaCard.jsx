import StatusDropdown from './StatusDropdown'
import { cn } from '../lib/cn'
import { genreLabels } from '../lib/genres'

// Poster card used in carousels and grids. Hover reveals the quick-add
// dropdown and lifts/scales the card.
//
// NOTE: this is a <div role="button"> rather than a <button> on purpose — it
// contains the StatusDropdown's own <button>s, and nesting interactive
// elements inside a <button> is invalid HTML (browsers swallow the inner
// clicks, which is why quick-add appeared to do nothing).
export default function MediaCard({ item, onOpen, className }) {
  const genres = genreLabels(item)

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

        {/* Hover info (desktop): full title, synopsis and genre chips over a
            bottom gradient. pointer-events-none so clicks still open the
            detail page; pb leaves room for the quick-add dropdown below. */}
        <div className="pointer-events-none absolute inset-0 hidden flex-col justify-end gap-1.5 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-2 pb-12 opacity-0 transition-opacity duration-200 md:flex md:group-hover:opacity-100">
          <p className="line-clamp-2 text-[13px] font-bold leading-snug text-white">
            {item.title}
          </p>
          {item.overview && (
            <p className="line-clamp-4 text-[11px] leading-relaxed text-white/85">
              {item.overview}
            </p>
          )}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {genres.map((g) => (
                <span
                  key={g}
                  className="rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold text-white/90"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>

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
