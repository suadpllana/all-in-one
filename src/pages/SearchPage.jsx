import { useSearchParams } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { getApi, ALL_CATEGORY_KEYS } from '../api'
import { CATEGORY_BY_KEY } from '../config/categories'
import { useOpenDetail } from '../hooks/useOpenDetail'
import Carousel from '../components/Carousel'
import { CardRowSkeleton } from '../components/Skeleton'
import { EmptyState } from '../components/states'

// Cross-category search: fans the query out to all six sources in parallel and
// groups the results by category.
export default function SearchPage() {
  const [params] = useSearchParams()
  const q = (params.get('q') || '').trim()
  const openDetail = useOpenDetail()

  const results = useQueries({
    queries: ALL_CATEGORY_KEYS.map((key) => ({
      queryKey: ['search', key, q],
      queryFn: ({ signal }) => getApi(key).search(q, signal),
      enabled: q.length > 1,
      staleTime: 10 * 60 * 1000,
      retry: 0,
    })),
  })

  const anyLoading = results.some((r) => r.isLoading && r.fetchStatus !== 'idle')
  const totalResults = results.reduce((n, r) => n + (r.data?.length || 0), 0)

  if (q.length < 2) {
    return <EmptyState icon="🔎" title="Search across everything" hint="Type at least two characters to search movies, TV, anime, books, games and documentaries at once." />
  }

  return (
    <div className="page-in space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">
          Results for <span className="text-gradient-accent">“{q}”</span>
        </h1>
        {!anyLoading && (
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {totalResults} {totalResults === 1 ? 'match' : 'matches'} across all categories
          </p>
        )}
      </div>

      {ALL_CATEGORY_KEYS.map((key, i) => {
        const res = results[i]
        const category = CATEGORY_BY_KEY[key]
        if (res.isLoading && res.fetchStatus !== 'idle') {
          return (
            <section key={key} className="space-y-3">
              <GroupHeader category={category} />
              <CardRowSkeleton count={5} />
            </section>
          )
        }
        if (!res.data || res.data.length === 0) return null
        return (
          <section key={key} className="space-y-3">
            <GroupHeader category={category} count={res.data.length} />
            <Carousel items={res.data} onOpen={openDetail} />
          </section>
        )
      })}

      {!anyLoading && totalResults === 0 && (
        <EmptyState icon="🫥" title={`No results for “${q}”`} hint="Try a different or shorter search term." />
      )}
    </div>
  )
}

function GroupHeader({ category, count }) {
  return (
    <div className="flex items-center gap-2">
      <span>{category.icon}</span>
      <h2 className="text-lg font-bold" style={{ color: category.accent }}>
        {category.label}
      </h2>
      {count != null && <span className="text-sm text-[var(--color-muted)]">({count})</span>}
    </div>
  )
}
