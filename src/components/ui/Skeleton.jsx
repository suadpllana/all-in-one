import { cn } from '../../lib/cn'
import { gridClass } from '../../lib/grid'

export function Skeleton({ className, style }) {
  return <div className={cn('skeleton rounded-md', className)} style={style} />
}

// Card-shaped placeholders so loading rows match the real layout per world.
const SHAPES = {
  poster: { box: 'aspect-[2/3]', w: 'w-[150px] sm:w-[176px] xl:w-[190px]' },
  wide: { box: 'aspect-video', w: 'w-[280px] sm:w-[320px]' },
  video: { box: 'aspect-video', w: 'w-[280px] sm:w-[320px]' },
  book: { box: 'aspect-[2/3]', w: 'w-[120px] sm:w-[138px]' },
}

export function RowSkeleton({ shape = 'poster', count = 8, lines = 2 }) {
  const s = SHAPES[shape] || SHAPES.poster
  return (
    <div className="-mx-4 flex gap-4 overflow-hidden px-4 pb-5 pt-2 md:-mx-8 md:px-8 xl:-mx-12 xl:px-12">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn('shrink-0', s.w)}>
          <Skeleton className={cn('w-full rounded-card', s.box)} />
          {lines > 0 && <Skeleton className="mt-3 h-3 w-3/4" />}
          {lines > 1 && <Skeleton className="mt-2 h-2.5 w-1/2" />}
        </div>
      ))}
    </div>
  )
}

export function GridSkeleton({ shape = 'poster', count = 12, className }) {
  const s = SHAPES[shape] || SHAPES.poster
  return (
    <div className={cn(gridClass(shape), className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <Skeleton className={cn('w-full rounded-card', s.box)} />
          <Skeleton className="mt-3 h-3 w-3/4" />
        </div>
      ))}
    </div>
  )
}

export function HeroSkeleton({ className }) {
  return <Skeleton className={cn('h-[70vh] min-h-[440px] w-full rounded-none', className)} />
}
