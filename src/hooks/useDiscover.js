import { useQuery } from '@tanstack/react-query'
import { getApi } from '../api'
import { useLibrary } from './useLibrary'

const HOUR = 60 * 60 * 1000

// One discovery shelf (trending | topRated | newReleases | upcoming …) for a
// category. `args` are extra arguments for the adapter call (after signal).
export function useSection(categoryKey, section, { enabled = true, args = [] } = {}) {
  return useQuery({
    queryKey: ['discover', categoryKey, section, ...args],
    queryFn: ({ signal }) => getApi(categoryKey)[section](signal, ...args),
    enabled,
    staleTime: HOUR,
    gcTime: 6 * HOUR,
    retry: 1,
  })
}

// Arbitrary world-specific query with the same caching policy.
export function useWorldQuery(key, fn, { enabled = true, staleTime = HOUR } = {}) {
  return useQuery({
    queryKey: ['world', ...key],
    queryFn: ({ signal }) => fn(signal),
    enabled,
    staleTime,
    gcTime: 6 * HOUR,
    retry: 1,
  })
}

export function useDetail(categoryKey, id) {
  return useQuery({
    queryKey: ['detail', categoryKey, id],
    queryFn: ({ signal }) => getApi(categoryKey).detail(id, signal),
    staleTime: 30 * 60 * 1000,
    enabled: Boolean(id),
  })
}

// Content-based "Recommended for you": the most common genres across your
// items in this world, then ask the API for more of the same (minus what
// you already have).
export function useRecommended(categoryKey) {
  const { items } = useLibrary()
  const mine = items.filter((i) => i.category === categoryKey)
  const genres = topGenres(mine)
  const owned = new Set(mine.map((i) => String(i.external_id)))

  return useQuery({
    queryKey: ['recommended', categoryKey, genres],
    queryFn: ({ signal }) => getApi(categoryKey).byGenres(genres, signal),
    enabled: genres.length > 0,
    staleTime: HOUR,
    retry: 1,
    select: (data) => (data || []).filter((i) => !owned.has(String(i.externalId))),
  })
}

function topGenres(rows) {
  const counts = new Map()
  for (const row of rows) {
    const ids = row.metadata?.genreIds || row.metadata?.genre_ids || genreNames(row.metadata)
    for (const g of ids || []) counts.set(g, (counts.get(g) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
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
