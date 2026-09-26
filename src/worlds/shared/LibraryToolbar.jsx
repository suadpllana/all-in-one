import { cn } from '../../lib/cn'
import Icon from '../../components/ui/Icon'
import { SORTS } from './library'

// Summary on the left (counts, totals — world-specific), sort + view
// toggles on the right.
export default function LibraryToolbar({ summary, sorts, sort, onSort, view, views, onView, children, className }) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">{summary}</div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {sorts && (
          <label className="relative flex items-center">
            <span className="sr-only">Sort by</span>
            <Icon name="sort" className="pointer-events-none absolute left-3 h-4 w-4 text-muted" />
            <select
              value={sort}
              onChange={(e) => onSort(e.target.value)}
              className="h-9 appearance-none rounded-ui bg-surface-2 pl-9 pr-8 text-sm font-semibold text-fg outline-none ring-1 ring-line transition-shadow focus:ring-2 focus:ring-accent"
            >
              {sorts.map((s) => (
                <option key={s} value={s}>
                  {SORTS[s].label}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" className="pointer-events-none absolute right-2.5 h-4 w-4 text-muted" />
          </label>
        )}
        {views && (
          <div role="group" aria-label="View" className="flex rounded-ui bg-surface-2 p-0.5 ring-1 ring-line">
            {views.map((v) => (
              <button
                key={v.key}
                type="button"
                title={v.label}
                aria-label={v.label}
                aria-pressed={view === v.key}
                onClick={() => onView(v.key)}
                className={cn(
                  'grid h-8 w-8 place-items-center rounded-[calc(var(--r-ui)-2px)] transition-colors',
                  view === v.key ? 'bg-accent text-on-accent' : 'text-muted hover:text-fg',
                )}
              >
                <Icon name={v.icon} className="h-4 w-4" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Big number + label pairs for library headers ("12 films · 26h 40m").
export function Summary({ stats }) {
  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-3">
      {stats.filter(Boolean).map((s) => (
        <div key={s.label}>
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{s.label}</dt>
          <dd className="mt-0.5 font-display text-3xl leading-none text-fg">{s.value}</dd>
        </div>
      ))}
    </dl>
  )
}
