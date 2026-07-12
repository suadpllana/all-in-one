import { useState } from 'react'
import MediaCard from '../components/MediaCard'
import { EmptyState } from '../components/states'
import { GridSkeleton } from '../components/Skeleton'
import { useLibrary } from '../hooks/useLibrary'
import { rowToItem } from '../lib/rowToItem'
import { toStars } from '../lib/rating'
import { STATUS } from '../config/categories'

// Sort options for the library grids. "My rating" only makes sense on the
// completed tab (that's where items get rated).
const SORTS = [
  { key: 'recent', label: 'Recently added' },
  { key: 'myRating', label: 'My rating', completedOnly: true },
  // Label completed per category from `ratingSource` (TMDB, RAWG, MAL…).
  { key: 'rating', label: 'Highest Rated' },
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'az', label: 'A–Z' },
]

function sortItems(items, sort) {
  const arr = [...items]
  switch (sort) {
    case 'myRating':
      // toStars so legacy 1-10 ratings compare fairly with 1-5 stars.
      return arr.sort((a, b) => (toStars(b._userRating) ?? -1) - (toStars(a._userRating) ?? -1))
    case 'rating':
      return arr.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))
    case 'newest':
      return arr.sort((a, b) => (b.year ?? -1) - (a.year ?? -1))
    case 'oldest':
      return arr.sort((a, b) => (a.year ?? Infinity) - (b.year ?? Infinity))
    case 'az':
      return arr.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
    default:
      return arr // 'recent' — itemsFor already orders newest-in-status first
  }
}

// Grid of the user's saved items for one category + status (used by the
// plan/progress/done submenu tabs). `query` filters the list by title.
export default function LibraryView({ category, status, statusLabel, query = '', onOpen }) {
  const { itemsFor, isLoading } = useLibrary()
  const [sort, setSort] = useState('recent')

  // Reset the sort when switching categories or tabs (render-time pattern,
  // avoids a syncing effect).
  const scope = `${category.key}/${status}`
  const [lastScope, setLastScope] = useState(scope)
  if (scope !== lastScope) {
    setLastScope(scope)
    setSort('recent')
  }

  if (isLoading) return <GridSkeleton />

  const rows = itemsFor(category.key, status)

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={category.icon}
        title={`Nothing in ${statusLabel} yet`}
        hint={`Browse Discover and use the quick-add button to build your ${statusLabel.toLowerCase()} list.`}
      />
    )
  }

  const q = query.trim().toLowerCase()
  const items = rows
    .map(rowToItem)
    .filter((item) => !q || (item.title || '').toLowerCase().includes(q))

  if (items.length === 0) {
    return (
      <EmptyState
        icon="🫥"
        title={`Nothing in ${statusLabel} matches “${query.trim()}”`}
        hint="Try a different term."
      />
    )
  }

  const sorts = SORTS.filter((s) => !s.completedOnly || status === STATUS.COMPLETED)
  const sorted = sortItems(items, sort)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-muted)]">
          {sorted.length} title{sorted.length === 1 ? '' : 's'}
        </p>
        <label className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
          Sort by
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-accent"
          >
            {sorts.map((s) => (
              <option key={s.key} value={s.key}>
                {s.key === 'rating' ? `Highest Rated (${category.ratingSource})` : s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {sorted.map((item) => (
          <MediaCard key={`${item.category}:${item.externalId}`} item={item} onOpen={onOpen} />
        ))}
      </div>
    </div>
  )
}
