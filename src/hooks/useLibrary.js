import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { libraryStore } from '../lib/libraryStore'
import { itemToMetadata } from '../lib/rowToItem'
import { useAuth } from '../context/AuthContext'

// Central hook for the user's library. Backed by react-query so status changes
// reflect instantly everywhere (cards, submenu counts, stats).
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

  const upsert = useMutation({
    mutationFn: (item) => libraryStore.upsert(userId, item),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })

  const remove = useMutation({
    mutationFn: (args) => libraryStore.remove(userId, args),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })

  // Fast lookup index: "category:externalId" -> row
  const index = useMemo(() => {
    const m = new Map()
    for (const row of items) m.set(`${row.category}:${row.external_id}`, row)
    return m
  }, [items])

  return {
    items,
    isLoading,
    getEntry: (category, externalId) => index.get(`${category}:${externalId}`) || null,
    getStatus: (category, externalId) =>
      index.get(`${category}:${externalId}`)?.status || null,
    itemsFor: (category, status) =>
      items.filter((i) => i.category === category && i.status === status),
    // item is a normalized API item; status/rating optional
    setStatus: (item, status) =>
      upsert.mutate({
        category: item.category,
        externalId: item.externalId,
        title: item.title,
        posterUrl: item.posterUrl,
        metadata: itemToMetadata(item),
        status,
      }),
    setRating: (item, userRating) => {
      const entry = index.get(`${item.category}:${item.externalId}`)
      upsert.mutate({
        category: item.category,
        externalId: item.externalId,
        title: item.title,
        posterUrl: item.posterUrl,
        metadata: itemToMetadata(item),
        status: entry?.status || 'completed',
        userRating,
      })
    },
    remove: (category, externalId) => remove.mutate({ category, externalId }),
    isMutating: upsert.isPending || remove.isPending,
  }
}
