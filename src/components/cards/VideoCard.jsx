import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { compact, timeAgo } from '../../lib/format'
import { detailPath } from '../../lib/paths'
import QuickActions from '../library/QuickActions'
import Icon from '../ui/Icon'
import Img from '../ui/Img'

export function ChannelAvatar({ name = '', src, className }) {
  const initial = name.replace(/^@/, '').charAt(0).toUpperCase() || '?'
  return (
    <span className={cn('relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-accent-grad text-sm font-bold text-white', className)}>
      {initial}
      {src && <img src={src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
    </span>
  )
}

// 16:9 video card in the video-platform idiom: thumbnail with a duration
// chip, channel avatar, title, views and age. `row` = compact list layout;
// `meta` replaces the views · age line (e.g. "Watched 3 days ago").
export default function VideoCard({ item, rail = false, row = false, meta, className }) {
  const views = item.views != null ? `${compact(item.views)} views` : null
  const age = item.publishedAt ? timeAgo(item.publishedAt) : item.year
  return (
    <div
      role={rail ? 'listitem' : undefined}
      className={cn(
        'group relative',
        rail && 'w-[280px] shrink-0 snap-start sm:w-[320px]',
        row && 'flex gap-3',
        className,
      )}
    >
      <div
        className={cn(
          'relative aspect-video overflow-hidden rounded-card bg-surface-2',
          row ? 'w-40 shrink-0 sm:w-44' : 'w-full',
        )}
      >
        <Img
          src={item.backdropUrl || item.posterUrl}
          title={item.title}
          className="absolute inset-0"
          imgClassName="transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 grid place-items-center bg-black/0 transition-colors duration-300 group-hover:bg-black/30">
          <span className="grid h-12 w-12 scale-75 place-items-center rounded-full bg-accent text-white opacity-0 shadow-xl transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
            <Icon name="playFill" className="ml-0.5 h-5 w-5" />
          </span>
        </div>
        {item.durationLabel && (
          <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
            {item.durationLabel}
          </span>
        )}
      </div>
      <div className={cn('flex min-w-0 gap-3', row ? 'flex-1' : 'mt-3')}>
        {!row && <ChannelAvatar name={item.channelTitle} src={item.channelAvatar} />}
        <div className="min-w-0 flex-1">
          <h3 className={cn('line-clamp-2 font-semibold leading-snug text-fg', row ? 'text-sm' : 'text-[15px]')}>
            {item.title}
          </h3>
          <p className="mt-1 truncate text-[13px] text-muted">{item.channelTitle}</p>
          <p className="truncate text-[13px] text-muted">{meta ?? [views, age].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      <Link to={detailPath(item)} aria-label={item.title} className="absolute inset-0 z-10 rounded-card" />
      <QuickActions item={item} compact={row} className="absolute right-2 top-2 z-20" />
    </div>
  )
}
