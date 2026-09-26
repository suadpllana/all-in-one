import { useEffect, useRef } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { cn } from '../../lib/cn'
import { gridClass } from '../../lib/grid'
import { Button } from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import { GridSkeleton } from '../../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../../components/ui/States'

const SORT_OPTIONS = [
  { key: 'popular', label: 'Popular' },
  { key: 'top', label: 'Top rated' },
  { key: 'new', label: 'Newest' },
]

// Paged, sortable grid for one genre/topic. `fetchPage({genre, sort, page},
// signal)` must resolve { items, page, totalPages }. Loads more on scroll.
export default function GenreBrowser({
  queryKey,
  title,
  kicker,
  genre,
  sort,
  onSort,
  sorts = SORT_OPTIONS,
  fetchPage,
  renderItem,
  shape = 'poster',
  onClose,
}) {
  const q = useInfiniteQuery({
    queryKey: ['browse', ...queryKey, genre, sort],
    queryFn: ({ pageParam, signal }) => fetchPage({ genre, sort, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    staleTime: 60 * 60 * 1000,
  })
  const sentinel = useRef(null)
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = q

  useEffect(() => {
    const el = sentinel.current
    if (!el || !hasNextPage) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) fetchNextPage()
      },
      { rootMargin: '600px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const seen = new Set()
  const items = (q.data?.pages || [])
    .flatMap((p) => p.items)
    .filter((it) => !seen.has(it.externalId) && seen.add(it.externalId))

  return (
    <section className="page-in">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          {kicker && <p className="kicker text-accent">{kicker}</p>}
          <h2 className="mt-1.5 font-display text-4xl text-fg md:text-6xl">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <div role="group" aria-label="Sort" className="flex rounded-ui bg-surface-2 p-1 ring-1 ring-line">
            {sorts.map((s) => (
              <button
                key={s.key}
                type="button"
                aria-pressed={sort === s.key}
                onClick={() => onSort(s.key)}
                className={cn(
                  'h-8 rounded-[calc(var(--r-ui)-3px)] px-3.5 text-[13px] font-semibold transition-colors',
                  sort === s.key ? 'bg-accent text-on-accent' : 'text-muted hover:text-fg',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          {onClose && (
            <Button variant="surface" size="sm" icon="x" onClick={onClose} className="h-10">
              Close
            </Button>
          )}
        </div>
      </div>

      {q.isLoading ? (
        <GridSkeleton shape={shape} />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={q.refetch} />
      ) : !items.length ? (
        <EmptyState icon="search" title="Nothing here" hint="Try another sort or genre." />
      ) : (
        <>
          <div className={gridClass(shape)}>{items.map((it) => renderItem(it))}</div>
          <div ref={sentinel} className="flex justify-center py-10">
            {isFetchingNextPage ? (
              <span className="flex items-center gap-2 text-sm text-muted">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" /> Loading more…
              </span>
            ) : hasNextPage ? (
              <Button variant="surface" onClick={() => fetchNextPage()}>
                Load more
              </Button>
            ) : (
              <span className="flex items-center gap-2 text-sm text-muted">
                <Icon name="check" className="h-4 w-4" /> That’s everything
              </span>
            )}
          </div>
        </>
      )}
    </section>
  )
}
