import { cn } from '../../lib/cn'
import Rail from '../../components/ui/Rail'
import { SectionHeader } from '../../components/ui/Section'
import { RowSkeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/States'

// A titled horizontal shelf from a react-query result: skeleton → error →
// rail of cards (rendered by the world via `render`).
export default function Shelf({
  query,
  render,
  shape = 'poster',
  hideWhenEmpty = false,
  limit,
  className,
  railClassName,
  gap,
  emptyText,
  arrowTop,
  ...header
}) {
  const { data, isLoading, error, refetch } = query
  const items = (Array.isArray(data) ? data : data?.items || []).slice(0, limit)

  if (!isLoading && !error && items.length === 0 && hideWhenEmpty) return null

  return (
    <section className={cn('rise', className)}>
      {header.title && <SectionHeader {...header} />}
      {isLoading ? (
        <RowSkeleton shape={shape} />
      ) : error ? (
        <ErrorState compact error={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <p className="py-6 text-sm text-muted">{emptyText || 'Nothing here yet.'}</p>
      ) : (
        <Rail label={header.title} className={railClassName} gap={gap} arrowTop={arrowTop}>
          {items.map((item, i) => render(item, i))}
        </Rail>
      )}
    </section>
  )
}
