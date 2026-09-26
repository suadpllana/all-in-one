import { Link } from 'react-router-dom'
import { CATEGORY_BY_KEY } from '../../config/categories'
import { useItemActions } from '../../hooks/useItemActions'
import { cn } from '../../lib/cn'
import { detailPath } from '../../lib/paths'
import { getProgress, stepLabel, stepSize } from '../../lib/progress'
import Icon from '../ui/Icon'
import Img from '../ui/Img'
import { ProgressBar } from '../ui/Progress'

// "Pick up where you left off" — one card shape for every world, tinted
// with the item's own accent, with the world's +1 action (episode, pages,
// hour) right on it.
export default function ContinueCard({ item, className }) {
  const c = CATEGORY_BY_KEY[item.category]
  const a = useItemActions(item)
  const info = getProgress({ ...item, _progress: a.progress ?? item._progress })
  const wide = item.backdropUrl && item.category !== 'book'

  return (
    <div data-accent={item.category} role="listitem" className={cn('group relative w-[290px] shrink-0 snap-start sm:w-[340px]', className)}>
      <div className="lift relative aspect-video overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-line">
        {wide ? (
          <Img src={item.backdropUrl} title={item.title} className="absolute inset-0" imgClassName="transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <>
            {item.posterUrl && <img src={item.posterUrl} alt="" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-2xl" />}
            <Img
              src={item.posterUrl}
              title={item.title}
              className="absolute bottom-4 right-4 top-4 aspect-[2/3] rounded-md shadow-2xl ring-1 ring-white/20"
            />
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
        <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
          <Icon name={c.icon} className="h-3.5 w-3.5 text-accent" />
          {c.short}
        </span>
        <div className={cn('absolute bottom-0 left-0 p-4', wide ? 'right-0' : 'right-28')}>
          <h3 className="line-clamp-2 font-display text-xl leading-tight text-white">{item.title}</h3>
          {info && (
            <>
              <p className="mt-1 text-xs font-semibold text-white/75">
                {info.detail}
                {info.left ? ` · ${info.left}` : ''}
              </p>
              <ProgressBar value={info.pct ?? 0} className="mt-2.5" trackClassName="bg-white/20" />
            </>
          )}
        </div>
      </div>
      <Link to={detailPath(item)} aria-label={`Continue ${item.title}`} className="absolute inset-0 z-10 rounded-2xl" />
      {c.tracking && (
        <button
          type="button"
          onClick={() => a.bump(stepSize(item.category))}
          className="absolute right-3 top-3 z-20 flex h-8 items-center gap-1 rounded-full bg-accent px-3 text-xs font-bold text-on-accent shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={2.6} />
          {stepLabel(item.category)}
        </button>
      )}
    </div>
  )
}
