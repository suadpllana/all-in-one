import { useLibrary } from '../../hooks/useLibrary'
import { rowToItem } from '../../lib/rowToItem'
import { toStars } from '../../lib/rating'

// Library sorting shared by every world's list views. Worlds pick which of
// these they offer (runtime makes sense for a film watchlist, pages for a
// reading list, playtime for a backlog…).
export const SORTS = {
  recent: { label: 'Recently added', fn: null },
  myRating: {
    label: 'My rating',
    fn: (a, b) => (toStars(b._userRating) ?? -1) - (toStars(a._userRating) ?? -1),
  },
  rating: { label: 'Highest rated', fn: (a, b) => (b.rating ?? -1) - (a.rating ?? -1) },
  newest: { label: 'Newest', fn: (a, b) => (b.year ?? -1) - (a.year ?? -1) },
  oldest: { label: 'Oldest', fn: (a, b) => (a.year ?? Infinity) - (b.year ?? Infinity) },
  az: { label: 'Title A–Z', fn: (a, b) => (a.title || '').localeCompare(b.title || '') },
  shortest: { label: 'Shortest first', fn: (a, b) => (a.runtime ?? Infinity) - (b.runtime ?? Infinity) },
  pages: { label: 'Shortest read', fn: (a, b) => (a.pageCount ?? Infinity) - (b.pageCount ?? Infinity) },
  playtime: { label: 'Quickest to beat', fn: (a, b) => (a.playtime ?? Infinity) - (b.playtime ?? Infinity) },
  progress: {
    label: 'Last updated',
    fn: (a, b) => (b._updatedAt || '').localeCompare(a._updatedAt || ''),
  },
}

export function sortItems(items, sort) {
  const fn = SORTS[sort]?.fn
  return fn ? [...items].sort(fn) : items
}

function matches(item, q) {
  if (!q) return true
  const hay = [item.title, ...(item.authors || []), item.channelTitle, item.network]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hay.includes(q)
}

// Items in one status of one world, filtered by `query`, newest-in-status
// first unless re-sorted.
export function useLibraryItems(categoryKey, status, query = '', sort = 'recent') {
  const { itemsFor, isLoading } = useLibrary()
  const all = itemsFor(categoryKey, status).map(rowToItem)
  const q = query.trim().toLowerCase()
  const items = sortItems(
    all.filter((i) => matches(i, q)),
    sort,
  )
  return { all, items, isLoading }
}
