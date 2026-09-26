import { Link } from 'react-router-dom'
import { useLibrary } from '../../hooks/useLibrary'
import { cn } from '../../lib/cn'
import { durationLabel } from '../../lib/duration'
import { detailPath } from '../../lib/paths'
import { getProgress } from '../../lib/progress'
import { toStars } from '../../lib/rating'
import QuickActions from '../library/QuickActions'
import Img from '../ui/Img'
import { ProgressBar } from '../ui/Progress'
import { Stars } from '../ui/Stars'

const SIZES = {
  sm: 'w-[124px] sm:w-[140px]',
  md: 'w-[146px] sm:w-[170px] xl:w-[186px]',
  lg: 'w-[168px] sm:w-[204px] xl:w-[224px]',
  fill: 'w-full',
}

// Portrait poster card (films, TV, anime, documentaries). The whole card is
// a link (stretched overlay) with quick status buttons layered above it.
export default function PosterCard({
  item,
  size = 'md',
  rail = false,
  meta,
  badge,
  topLeft,
  overlay,
  showProgress = false,
  showMeta = true,
  className,
}) {
  const { getEntry } = useLibrary()
  const entry = getEntry(item.category, item.externalId)
  const stars = toStars(entry?.user_rating ?? item._userRating)
  const progress = showProgress
    ? getProgress({ ...item, _progress: entry?.progress ?? item._progress })
    : null

  const line =
    meta ??
    [item.year, durationLabel(item), item.rating != null && !stars ? `★ ${item.rating.toFixed(1)}` : null]
      .filter(Boolean)
      .join(' · ')

  return (
    <div
      role={rail ? 'listitem' : undefined}
      className={cn('group relative shrink-0', rail && 'snap-start', SIZES[size], className)}
    >
      <div className="lift relative aspect-[2/3] overflow-hidden rounded-card bg-surface-2 ring-1 ring-line/70">
        <Img
          src={item.posterUrl}
          title={item.title}
          className="absolute inset-0"
          imgClassName="transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/0 to-black/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        {badge && (
          <span className="absolute left-2 top-2 rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-on-accent shadow">
            {badge}
          </span>
        )}
        {topLeft && <div className={cn('absolute left-2', badge ? 'top-8' : 'top-2')}>{topLeft}</div>}
        {overlay && !progress && <div className="absolute inset-x-0 bottom-0">{overlay}</div>}
        {progress && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2.5 pb-2.5 pt-8">
            <p className="mb-1.5 text-[11px] font-bold text-white">{progress.label}</p>
            <ProgressBar value={progress.pct ?? 0} trackClassName="bg-white/25" />
          </div>
        )}
      </div>
      {showMeta && (
        <div className="mt-2.5 px-0.5">
          <h3 className="truncate text-[14px] font-semibold leading-snug text-fg">{item.title}</h3>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
            {stars != null && <Stars value={stars} size={11} />}
            <span className="truncate">{line}</span>
          </div>
        </div>
      )}
      <Link
        to={detailPath(item)}
        aria-label={`${item.title}${item.year ? ` (${item.year})` : ''}`}
        className="absolute inset-0 z-10 rounded-card focus-visible:outline-offset-4"
      />
      <QuickActions item={item} className="absolute right-2 top-2 z-20" />
    </div>
  )
}
