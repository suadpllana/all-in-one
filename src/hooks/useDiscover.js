import { useQuery } from '@tanstack/react-query'
import { getApi } from '../api'
import { useLibrary } from './useLibrary'

const HOUR = 60 * 60 * 1000

// One discovery shelf (trending | topRated | newReleases) for a category.
export function useSection(categoryKey, section, enabled = true) {
  return useQuery({
    queryKey: ['discover', categoryKey, section],
    queryFn: ({ signal }) => getApi(categoryKey)[section](signal),
    enabled,
    staleTime: HOUR,
    gcTime: 6 * HOUR,
    retry: 1,
  })
}

// Content-based "Recommended for you": collect the most common genres from the
// user's items in this category, then query the API for more of the same.
export function useRecommended(categoryKey) {
  const { items } = useLibrary()
  const mine = items.filter((i) => i.category === categoryKey)

  const genres = topGenres(mine)

  return useQuery({
    queryKey: ['recommended', categoryKey, genres],
    queryFn: ({ signal }) => getApi(categoryKey).byGenres(genres, signal),
    enabled: genres.length > 0,
    staleTime: HOUR,
    retry: 1,
  })
}

function topGenres(rows) {
  const counts = new Map()
  for (const row of rows) {
    const ids =
      row.metadata?.genreIds || row.metadata?.genre_ids || genreNames(row.metadata)
    for (const g of ids || []) counts.set(g, (counts.get(g) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([g]) => g)
}

// Different sources store genres differently in the cached metadata.
function genreNames(meta) {
  if (!meta) return []
  if (Array.isArray(meta.genres)) {
    return meta.genres.map((g) => (typeof g === 'string' ? g : g.name || g.slug)).filter(Boolean)
  }
  if (Array.isArray(meta.categories)) return meta.categories
  return []
}
