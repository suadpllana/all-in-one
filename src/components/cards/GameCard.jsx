import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { rawgThumb } from '../../api/rawg'
import { useLibrary } from '../../hooks/useLibrary'
import { cn } from '../../lib/cn'
import { scoreTone } from '../../lib/format'
import { genreLabels } from '../../lib/genres'
import { detailPath } from '../../lib/paths'
import { getProgress } from '../../lib/progress'
import QuickActions from '../library/QuickActions'
import Img from '../ui/Img'
import { ProgressBar } from '../ui/Progress'
import Platforms from './Platforms'

const SIZES = {
  md: 'w-[272px] sm:w-[320px] xl:w-[340px]',
  lg: 'w-[300px] sm:w-[400px]',
  fill: 'w-full',
}

// Landscape game capsule with a chamfered HUD frame. Moving the pointer
// across it scrubs through the game's screenshots (segment bar shows which).
export default function GameCard({ item, size = 'md', rail = false, showProgress = false, className }) {
  const { getEntry } = useLibrary()
  const entry = getEntry(item.category, item.externalId)
  const shots = [item.backdropUrl || item.posterUrl, ...(item.backdropAlts || [])]
    .filter(Boolean)
    .filter((u, i, a) => a.indexOf(u) === i)
    .slice(0, 6)
  const [idx, setIdx] = useState(0)
  const [armed, setArmed] = useState(false)
  const frame = useRef(null)
  const progress = showProgress ? getProgress({ ...item, _progress: entry?.progress ?? item._progress }) : null
  const meta = item.metacritic ?? (item.rating != null ? Math.round(item.rating * 10) : null)

  function onMove(e) {
    if (shots.length < 2 || !frame.current) return
    const r = frame.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    setIdx(Math.max(0, Math.min(shots.length - 1, Math.floor(x * shots.length))))
  }

  return (
    <div
      role={rail ? 'listitem' : undefined}
      onMouseEnter={() => setArmed(true)}
      onMouseMove={onMove}
      onMouseLeave={() => setIdx(0)}
      className={cn('group relative shrink-0', rail && 'snap-start', SIZES[size], className)}
    >
      <div
        ref={frame}
        className="chamfer relative aspect-video overflow-hidden bg-surface-2 transition-transform duration-300 group-hover:-translate-y-1"
      >
        {/* Screenshots are stacked and cross-faded; extras only mount once
            the card has been hovered. */}
        {shots.map((src, i) =>
          i === 0 || armed ? (
            <Img
              key={src}
              src={rawgThumb(src)}
              fallbackSrc={src}
              title={item.title}
              className={cn(
                'absolute inset-0 transition-opacity duration-300',
                i === idx ? 'opacity-100' : 'opacity-0',
              )}
            />
          ) : null,
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10" />
        <div className="pointer-events-none absolute inset-0 opacity-0 ring-2 ring-inset ring-accent transition-opacity duration-200 group-hover:opacity-100" />
        {meta != null && (
          <span
            title={item.metacritic != null ? 'Metacritic' : 'Rating'}
            className={cn('absolute left-2.5 top-2.5 min-w-9 px-1.5 py-1 text-center font-display text-sm leading-none', scoreTone(meta))}
          >
            {meta}
          </span>
        )}
        {shots.length > 1 && (
          <div className="absolute inset-x-3 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {shots.map((s, i) => (
              <span key={s} className={cn('h-[3px] flex-1 rounded-full', i === idx ? 'bg-accent' : 'bg-white/35')} />
            ))}
          </div>
        )}
        {progress && (
          <div className="absolute inset-x-3 bottom-3">
            <p className="mb-1.5 text-[11px] font-bold text-white">{progress.detail}</p>
            <ProgressBar value={progress.pct ?? 0} trackClassName="bg-white/25" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-[15px] leading-tight text-fg">{item.title}</h3>
          <p className="mt-1 truncate text-xs text-muted">
            {[genreLabels(item, 2).join(', '), item.playtime ? `~${item.playtime}h` : null, item.year]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <Platforms platforms={item.platforms} />
      </div>
      <Link to={detailPath(item)} aria-label={item.title} className="absolute inset-0 z-10" />
      <QuickActions item={item} className="absolute right-2.5 top-2.5 z-20" />
    </div>
  )
}
