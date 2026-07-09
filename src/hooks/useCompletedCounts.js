import { useMemo } from 'react'
import { STATUS } from '../config/categories'
import { useLibrary } from './useLibrary'

// Completed items ("Watched"/"Played"/"Read") per category, for nav badges.
export function useCompletedCounts() {
  const { items } = useLibrary()
  return useMemo(() => {
    const counts = {}
    for (const i of items) {
      if (i.status === STATUS.COMPLETED) counts[i.category] = (counts[i.category] || 0) + 1
    }
    return counts
  }, [items])
}
