import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { libraryStore } from '../lib/libraryStore'
import { localLibrary } from '../lib/localLibrary'
import { itemToMetadata } from '../lib/rowToItem'
import { useAuth } from '../context/AuthContext'

// When a row entered its current status (drives the newest-first library
// order). Old rows may predate some timestamps, hence the fallbacks.
function statusTime(row) {
  return (
    (row.status === 'completed' && row.completed_at) ||
    (row.status === 'in_progress' && row.updated_at) ||
    row.added_at ||
    row.updated_at ||
    ''
  )
}

const keyOf = (category, externalId) => `${category}:${externalId}`

// The freshest copy of a row, read straight from storage — so rapid-fire
// actions (+1 episode clicked three times) build on each other instead of on
// a stale render.
export function readRow(category, externalId) {
  return localLibrary.list().find((r) => r.id === keyOf(category, externalId)) || null
}

// Central hook for the user's library. Backed by react-query so changes
// reflect instantly everywhere (cards, tab counts, stats, home).
export function useLibrary() {
  const { user } = useAuth()
  const userId = user?.id
  const qc = useQueryClient()
  const key = ['library', userId]

  const { data: items = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: () => libraryStore.list(userId),
    enabled: Boolean(userId),
    staleTime: 60_000,
  })

  const onSuccess = () => qc.invalidateQueries({ queryKey: ['library'] })
  const upsert = useMutation({ mutationFn: (item) => libraryStore.upsert(userId, item), onSuccess })
  const put = useMutation({ mutationFn: (row) => libraryStore.put(userId, row), onSuccess })
  const remove = useMutation({ mutationFn: (args) => libraryStore.remove(userId, args), onSuccess })

  // Fast lookup index: "category:externalId" -> row
  const index = useMemo(() => {
    const m = new Map()
    for (const row of items) m.set(keyOf(row.category, row.external_id), row)
    return m
  }, [items])

  const base = (item) => ({
    category: item.category,
    externalId: item.externalId,
    title: item.title,
    posterUrl: item.posterUrl,
    metadata: itemToMetadata(item),
  })

  return {
    items,
    isLoading,
    getEntry: (category, externalId) => index.get(keyOf(category, externalId)) || null,
    getStatus: (category, externalId) => index.get(keyOf(category, externalId))?.status || null,
    // Newest first: sorted by when the item entered this status, so a
    // freshly finished film tops the diary even if it sat on the watchlist
    // for months.
    itemsFor: (category, status) =>
      items
        .filter((i) => i.category === category && (!status || i.status === status))
        .sort((a, b) => statusTime(b).localeCompare(statusTime(a))),
    // Generic patch. `patch` may carry status, userRating, progress,
    // favorite, review, completedAt. Unsaved items default to `fallback`.
    update: (item, patch, fallback = 'wishlist') => {
      const current = readRow(item.category, item.externalId)
      upsert.mutate({ ...base(item), ...patch, status: patch.status ?? current?.status ?? fallback })
    },
    setStatus: (item, status) => upsert.mutate({ ...base(item), status }),
    setRating: (item, userRating) => {
      const current = readRow(item.category, item.externalId)
      upsert.mutate({ ...base(item), status: current?.status || 'completed', userRating })
    },
    restore: (row) => put.mutate(row),
    remove: (category, externalId) => remove.mutate({ category, externalId }),
    isMutating: upsert.isPending || remove.isPending || put.isPending,
  }
}
