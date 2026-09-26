import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { formatMinutes } from '../../lib/duration'
import { detailPath } from '../../lib/paths'
import QuickActions from '../../components/library/QuickActions'
import Img from '../../components/ui/Img'
import { topicsOf } from './lib'

// Editorial pieces for the documentaries world.

// First sentence of a synopsis, as a magazine "deck".
export function Deck({ text, className, lines = 3 }) {
  if (!text) return null
  return <p className={cn('font-read text-fg-2', lines === 2 ? 'line-clamp-2' : lines === 3 ? 'line-clamp-3' : 'line-clamp-4', className)}>{text}</p>
}

// A story card: image, kicker, serif headline, deck, meta.
export function StoryCard({ item, size = 'md', rail = false, className }) {
  const big = size === 'lg'
  const kicker = topicsOf(item)[0] || 'Documentary'
  return (
    <article
      role={rail ? 'listitem' : undefined}
      className={cn('group relative', rail && 'w-[300px] shrink-0 snap-start sm:w-[340px]', className)}
    >
      <div className="relative overflow-hidden rounded-card bg-surface-2">
        <Img
          src={item.backdropUrl || item.posterUrl}
          title={item.title}
          className={cn('w-full', big ? 'aspect-[16/10]' : 'aspect-[3/2]')}
          imgClassName="transition-transform duration-700 group-hover:scale-105"
        />
      </div>
      <p className="kicker mt-4 text-[10px] text-accent">{kicker}</p>
      <h3 className={cn('mt-1.5 font-display leading-[1.05] text-fg transition-colors group-hover:text-accent', big ? 'text-4xl md:text-5xl' : 'text-2xl')}>
        {item.title}
      </h3>
      <Deck text={item.overview} lines={big ? 4 : 2} className={cn('mt-2', big ? 'text-[16px] leading-relaxed' : 'text-sm leading-relaxed')} />
      <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted">
        {[item.year, formatMinutes(item.runtime), item.rating ? `★ ${item.rating.toFixed(1)}` : null].filter(Boolean).join('  ·  ')}
      </p>
      <Link to={detailPath(item)} aria-label={item.title} className="absolute inset-0 z-10" />
      <QuickActions item={item} className="absolute right-3 top-3 z-20" />
    </article>
  )
}
