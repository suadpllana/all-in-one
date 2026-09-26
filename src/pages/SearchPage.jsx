import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { getApi, ALL_CATEGORY_KEYS } from '../api'
import { CATEGORY_BY_KEY } from '../config/categories'
import { useDocumentTitle, useTheme } from '../hooks/useTheme'
import { cn } from '../lib/cn'
import { gridClass } from '../lib/grid'
import MediaCard from '../components/cards/MediaCard'
import Icon from '../components/ui/Icon'
import Rail from '../components/ui/Rail'
import { GridSkeleton, RowSkeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/States'

// Cross-world search: one query fanned out to all seven sources in
// parallel. "All" shows a shelf per world (each in its own card shape and
// accent); picking a world shows its full grid.
export default function SearchPage() {
  useTheme('home')
  const [params, setParams] = useSearchParams()
  const urlQ = (params.get('q') || '').trim()
  const world = params.get('in')
  const [draft, setDraft] = useState(urlQ)
  const [synced, setSynced] = useState(urlQ)
  // Follow external changes to ?q= (palette, back button).
  if (urlQ !== synced) {
    setSynced(urlQ)
    setDraft(urlQ)
  }
  // The URL is the source of truth; typing updates it after a pause.
  const q = urlQ
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  useDocumentTitle(q ? `“${q}”` : 'Search')

  function onType(value) {
    setDraft(value)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          if (value.trim()) p.set('q', value.trim())
          else p.delete('q')
          return p
        },
        { replace: true },
      )
    }, 350)
  }

  const results = useQueries({
    queries: ALL_CATEGORY_KEYS.map((key) => ({
      queryKey: ['search', key, q],
      queryFn: ({ signal }) => getApi(key).search(q, signal),
      enabled: q.length > 1,
      staleTime: 10 * 60 * 1000,
      retry: 0,
    })),
  })

  const loading = (r) => r.isLoading && r.fetchStatus !== 'idle'
  const anyLoading = results.some(loading)
  const total = results.reduce((n, r) => n + (r.data?.length || 0), 0)
  const setWorld = (key) =>
    setParams((prev) => {
      const p = new URLSearchParams(prev)
      if (key) p.set('in', key)
      else p.delete('in')
      return p
    })

  return (
    <div className="shell page-in pb-10 pt-8 md:pt-12">
      <div className="relative">
        <Icon name="search" className="pointer-events-none absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-accent" />
        <input
          value={draft}
          onChange={(e) => onType(e.target.value)}
          autoFocus={!urlQ}
          placeholder="Search everything…"
          aria-label="Search everything"
          className="h-16 w-full rounded-2xl bg-surface pl-14 pr-5 text-xl font-semibold text-fg outline-none ring-1 ring-line transition-shadow placeholder:font-normal placeholder:text-muted focus:ring-2 focus:ring-accent md:h-20 md:text-2xl"
        />
      </div>

      {q.length < 2 ? (
        <EmptyState
          className="mt-10"
          icon="search"
          title="Search every world at once"
          hint="Films, TV, anime, books, games, documentaries and YouTube — type at least two characters."
        />
      ) : (
        <>
          <div className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
            <FilterChip active={!world} onClick={() => setWorld(null)}>
              All {!anyLoading && <span className="opacity-60">{total}</span>}
            </FilterChip>
            {ALL_CATEGORY_KEYS.map((key, i) => {
              const c = CATEGORY_BY_KEY[key]
              const n = results[i].data?.length
              return (
                <FilterChip key={key} accent={key} active={world === key} onClick={() => setWorld(world === key ? null : key)}>
                  <Icon name={c.icon} className="h-4 w-4" />
                  {c.short}
                  {loading(results[i]) ? (
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent opacity-60" />
                  ) : (
                    n != null && <span className="opacity-60">{n}</span>
                  )}
                </FilterChip>
              )
            })}
          </div>

          <div className="mt-10 space-y-14">
            {ALL_CATEGORY_KEYS.map((key, i) => {
              if (world && world !== key) return null
              const r = results[i]
              const c = CATEGORY_BY_KEY[key]
              const data = r.data || []
              if (!loading(r) && !data.length) return null
              return (
                <section key={key} data-accent={key}>
                  <div className="mb-3 flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-ui bg-accent-soft text-accent">
                      <Icon name={c.icon} className="h-5 w-5" />
                    </span>
                    <h2 className="display text-3xl text-fg">{c.label}</h2>
                    {!loading(r) && <span className="text-sm text-muted">{data.length} results</span>}
                  </div>
                  {loading(r) ? (
                    world ? <GridSkeleton shape={c.shape} /> : <RowSkeleton shape={c.shape} count={6} />
                  ) : world ? (
                    <div className={gridClass(c.shape)}>
                      {data.map((item) => (
                        <MediaCard key={item.externalId} item={item} size="fill" />
                      ))}
                    </div>
                  ) : (
                    <Rail label={c.label} className="items-start">
                      {data.map((item) => (
                        <MediaCard key={item.externalId} item={item} rail size="sm" />
                      ))}
                    </Rail>
                  )}
                </section>
              )
            })}
          </div>

          {!anyLoading && total === 0 && (
            <EmptyState className="mt-6" icon="search" title={`Nothing found for “${q}”`} hint="Try a different spelling, or fewer words." />
          )}
        </>
      )}
    </div>
  )
}

function FilterChip({ active, accent, children, onClick }) {
  return (
    <button
      type="button"
      data-accent={accent}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors',
        active ? 'bg-accent text-on-accent' : 'bg-surface-2 text-fg-2 ring-1 ring-line hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}
