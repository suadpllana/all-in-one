import { Link } from 'react-router-dom'
import { useLibrary } from '../../hooks/useLibrary'
import { cn } from '../../lib/cn'
import { bookThickness } from '../../lib/format'
import { detailPath } from '../../lib/paths'
import { getProgress } from '../../lib/progress'
import { toStars } from '../../lib/rating'
import QuickActions from '../library/QuickActions'
import Img from '../ui/Img'
import { ProgressBar } from '../ui/Progress'
import { Stars } from '../ui/Stars'

const SIZES = {
  sm: 'w-[100px] sm:w-[112px]',
  md: 'w-[118px] sm:w-[136px]',
  lg: 'w-[150px] sm:w-[176px]',
  fill: 'w-full',
}

// A physical book: 3D-tilted cover with page edges, serif title, author and
// reader rating. Straightens up on hover like it's being pulled off a shelf.
export default function BookCard({ item, size = 'md', rail = false, showProgress = false, shelf = false, className }) {
  const { getEntry } = useLibrary()
  const entry = getEntry(item.category, item.externalId)
  const myStars = toStars(entry?.user_rating ?? item._userRating)
  const progress = showProgress
    ? getProgress({ ...item, _progress: entry?.progress ?? item._progress })
    : null
  const author = item.authors?.[0]

  return (
    <div
      role={rail ? 'listitem' : undefined}
      className={cn('group relative shrink-0', rail && 'snap-start', SIZES[size], className)}
    >
      <div className="relative">
        <div className="book3d" style={{ '--thick': `${bookThickness(item.pageCount)}px` }}>
          <div className="cover aspect-[2/3] bg-surface-2">
            <Img src={item.posterUrl} title={item.title} className="h-full w-full" />
          </div>
          <div className="pages" />
        </div>
        {/* A plank segment; neighbours' segments meet across the gap so a
            row of books stands on one continuous shelf. */}
        {shelf && <div aria-hidden className="plank absolute -left-4 -right-4 top-full" />}
      </div>
      <div className={cn('pr-1', shelf ? 'mt-7' : 'mt-4')}>
        <h3 className="line-clamp-2 font-display text-[15px] leading-snug text-fg">{item.title}</h3>
        {author && <p className="mt-0.5 truncate text-xs text-muted">{author}</p>}
        {progress ? (
          <div className="mt-2">
            <ProgressBar value={progress.pct ?? 0} />
            <p className="mt-1 text-[11px] font-semibold text-muted">{progress.label}</p>
          </div>
        ) : myStars != null ? (
          <Stars value={myStars} size={11} className="mt-1.5" />
        ) : item.rating != null ? (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted">
            <Stars value={Math.round(item.rating) / 2} size={10} />
            {(item.rating / 2).toFixed(1)}
          </p>
        ) : null}
      </div>
      <Link to={detailPath(item)} aria-label={`${item.title}${author ? ` by ${author}` : ''}`} className="absolute inset-0 z-10" />
      <QuickActions item={item} compact className="absolute right-2 top-2 z-20" />
    </div>
  )
}
