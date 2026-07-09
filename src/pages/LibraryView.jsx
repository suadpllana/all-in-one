import MediaCard from '../components/MediaCard'
import { EmptyState } from '../components/states'
import { GridSkeleton } from '../components/Skeleton'
import { useLibrary } from '../hooks/useLibrary'
import { rowToItem } from '../lib/rowToItem'

// Grid of the user's saved items for one category + status (used by the
// plan/progress/done submenu tabs).
export default function LibraryView({ category, status, statusLabel, onOpen }) {
  const { itemsFor, isLoading } = useLibrary()

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

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {rows.map((row) => (
        <MediaCard key={row.id} item={rowToItem(row)} onOpen={onOpen} />
      ))}
    </div>
  )
}
