import { useQuery } from '@tanstack/react-query'
import { getApi } from '../../api'
import { useDebounce } from '../../hooks/useDebounce'
import { gridClass } from '../../lib/grid'
import MediaCard from '../../components/cards/MediaCard'
import { GridSkeleton } from '../../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../../components/ui/States'

// Search scoped to one world, shown in place of Discover while the world's
// search field has a query.
export default function WorldSearch({ category, query }) {
  const q = useDebounce(query.trim(), 350)
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['search', category.key, q],
    queryFn: ({ signal }) => getApi(category.key).search(q, signal),
    enabled: q.length > 1,
    staleTime: 10 * 60 * 1000,
    retry: 0,
  })

  return (
    <div className="shell page-in py-8">
      <div className="mb-6">
        <p className="kicker text-accent">Search · {category.label}</p>
        <h1 className="mt-2 font-display text-4xl text-fg md:text-5xl">“{query.trim()}”</h1>
        {data && !isLoading && (
          <p className="mt-2 text-sm text-muted">
            {data.length} result{data.length === 1 ? '' : 's'}
          </p>
        )}
      </div>
      {q.length < 2 ? (
        <p className="text-sm text-muted">Keep typing…</p>
      ) : isLoading ? (
        <GridSkeleton shape={category.shape} />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !data?.length ? (
        <EmptyState icon="search" title={`No ${category.label.toLowerCase()} match “${q}”`} hint="Try a different spelling, or fewer words." />
      ) : (
        <div className={gridClass(category.shape)}>
          {data.map((item) => (
            <MediaCard key={`${item.category}:${item.externalId}`} item={item} size="fill" />
          ))}
        </div>
      )}
    </div>
  )
}
