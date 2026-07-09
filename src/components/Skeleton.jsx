import { cn } from '../lib/cn'

export function Skeleton({ className }) {
  return <div className={cn('skeleton rounded-md', className)} />
}

// A row of poster-card skeletons matching the real card grid dimensions.
export function CardRowSkeleton({ count = 6 }) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-[150px] shrink-0 sm:w-[170px]">
          <Skeleton className="aspect-[2/3] w-full rounded-card" />
          <Skeleton className="mt-2 h-3 w-3/4" />
          <Skeleton className="mt-1.5 h-2.5 w-1/2" />
        </div>
      ))}
    </div>
  )
}

export function HeroSkeleton() {
  return <Skeleton className="h-[42vh] min-h-[280px] w-full rounded-2xl" />
}

// Grid of skeletons for library / search results.
export function GridSkeleton({ count = 12 }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <Skeleton className="aspect-[2/3] w-full rounded-card" />
          <Skeleton className="mt-2 h-3 w-3/4" />
        </div>
      ))}
    </div>
  )
}
