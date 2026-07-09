import { useQuery } from '@tanstack/react-query'
import { getApi } from '../api'
import MediaCard from './MediaCard'
import { GridSkeleton } from './Skeleton'
import { EmptyState, ErrorState } from './states'

// Search scoped to a single category, shown inside a category page in place of
// the Discover shelves while there's an active query.
export default function CategorySearch({ category, query, onOpen }) {
  const q = query.trim()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['search', category.key, q],
    queryFn: ({ signal }) => getApi(category.key).search(q, signal),
    enabled: q.length > 1,
    staleTime: 10 * 60 * 1000,
    retry: 0,
  })

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-muted)]">
        Searching {category.label} for <span className="text-accent">“{q}”</span>
        {!isLoading && data ? ` · ${data.length} result${data.length === 1 ? '' : 's'}` : ''}
      </p>

      {isLoading && <GridSkeleton count={12} />}
      {error && <ErrorState error={error} onRetry={refetch} />}
      {!isLoading && !error && data && data.length === 0 && (
        <EmptyState icon="🫥" title={`No ${category.label} match “${q}”`} hint="Try a different term." />
      )}
      {data && data.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {data.map((item) => (
            <MediaCard key={`${item.category}:${item.externalId}`} item={item} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  )
}
