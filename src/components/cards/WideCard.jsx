import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { monthDay } from '../../lib/format'
import { detailPath } from '../../lib/paths'
import QuickActions from '../library/QuickActions'
import Img from '../ui/Img'
import { ProgressBar } from '../ui/Progress'

const SIZES = {
  md: 'w-[272px] sm:w-[330px] xl:w-[360px]',
  lg: 'w-[300px] sm:w-[420px] xl:w-[460px]',
  fill: 'w-full',
}

// 16:9 still with the title set over it — TV "trending", coming-soon films
// (with a calendar badge), continue-watching (with progress + action).
export default function WideCard({
  item,
  size = 'md',
  rail = false,
  kicker,
  sub,
  date,
  progress,
  action,
  className,
}) {
  const md = date ? monthDay(date) : null
  return (
    <div
      role={rail ? 'listitem' : undefined}
      className={cn('group relative shrink-0', rail && 'snap-start', SIZES[size], className)}
    >
      <div className="lift relative aspect-video overflow-hidden rounded-card bg-surface-2 ring-1 ring-line/70">
        <Img
          src={item.backdropUrl || item.posterUrl}
          title={item.title}
          className="absolute inset-0"
          imgClassName="transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/0" />
        {md && (
          <div className="absolute left-3 top-3 overflow-hidden rounded-lg bg-white text-center text-black shadow-xl">
            <p className="bg-accent px-2.5 py-0.5 text-[10px] font-extrabold tracking-widest text-on-accent">{md.month}</p>
            <p className="px-2 pb-0.5 font-display text-2xl leading-tight">{md.day}</p>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 p-4">
          {kicker && <p className="kicker mb-1 text-[10px] text-white/75">{kicker}</p>}
          <h3 className="line-clamp-2 font-display text-[1.35rem] leading-[1.05] text-white drop-shadow-md">
            {item.title}
          </h3>
          {sub && <p className="mt-1 truncate text-xs font-medium text-white/75">{sub}</p>}
          {progress && <ProgressBar value={progress.pct ?? 0} className="mt-3" trackClassName="bg-white/25" />}
        </div>
      </div>
      <Link
        to={detailPath(item)}
        aria-label={item.title}
        className="absolute inset-0 z-10 rounded-card focus-visible:outline-offset-4"
      />
      <QuickActions item={item} className="absolute right-2.5 top-2.5 z-20" />
      {action && <div className="absolute bottom-3.5 right-3.5 z-20">{action}</div>}
    </div>
  )
}
