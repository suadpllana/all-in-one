import { useState } from 'react'
import { youtube } from '../../api/youtube'
import { STATUS } from '../../config/categories'
import { useSection, useWorldQuery } from '../../hooks/useDiscover'
import { useItemActions } from '../../hooks/useItemActions'
import { cn } from '../../lib/cn'
import { compact, formatDate, timeAgo } from '../../lib/format'
import VideoCard, { ChannelAvatar } from '../../components/cards/VideoCard'
import { FavoriteButton } from '../../components/library/StatusControl'
import { Button } from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import { Skeleton } from '../../components/ui/Skeleton'
import { StarRatingInput } from '../../components/ui/Stars'
import { BackButton, DetailError, ReviewBox } from '../shared/Detail'
import { useLibraryItems } from '../shared/library'
import { useDetailPage } from '../shared/useDetailPage'

// The watch page: the video itself, embedded (privacy-enhanced player), the
// channel row, an expandable description, and what to watch next.
export default function YouTubeDetail({ category }) {
  const { data: v, isLoading, error, refetch } = useDetailPage('youtube')
  if (error) return <DetailError error={error} onRetry={refetch} fallback={category.route} />
  if (isLoading || !v) {
    return (
      <div className="shell grid grid-cols-1 gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div>
          <Skeleton className="aspect-video w-full rounded-2xl" />
          <Skeleton className="mt-5 h-8 w-3/4" />
          <Skeleton className="mt-3 h-12 w-1/2" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }
  return <Watch v={v} category={category} />
}

function Watch({ v, category }) {
  const a = useItemActions(v)
  const [expanded, setExpanded] = useState(false)
  const more = useWorldQuery(['yt-channel', v.channelId], (signal) => youtube.fromChannel(v.channelId, signal), { enabled: Boolean(v.channelId) })
  const latest = useSection('youtube', 'newReleases')
  const { all: queue } = useLibraryItems('youtube', STATUS.WISHLIST)
  const stars = a.userRating != null ? (a.userRating > 5 ? a.userRating / 2 : a.userRating) : null

  // The sidebar: what's next in your Watch Later, more from this channel,
  // then fresh uploads from elsewhere — each video listed once.
  const seen = new Set([v.externalId])
  const take = (list, n) => {
    const out = []
    for (const x of list || []) {
      if (out.length >= n) break
      if (seen.has(x.externalId)) continue
      seen.add(x.externalId)
      out.push(x)
    }
    return out
  }
  const fromQueue = take(queue, 3)
  const fromChannel = take(more.data, 8)
  const elsewhere = take(latest.data, Math.max(4, 12 - fromChannel.length))
  const groups = [
    ['Next in Watch Later', fromQueue],
    [`More from ${v.channelTitle}`, fromChannel],
    [fromChannel.length ? 'Up next' : 'Watch next', elsewhere],
  ].filter(([, list]) => list.length)

  return (
    <div className="shell page-in pb-8 pt-6">
      <BackButton fallback={category.route} glass={false} />
      <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0">
          <div className="aspect-video overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-line">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${v.externalId}?rel=0&modestbranding=1`}
              title={v.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              className="h-full w-full"
            />
          </div>

          <h1 className="mt-5 text-xl font-bold leading-snug text-fg md:text-2xl">{v.title}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ChannelAvatar name={v.channelTitle} src={v.channelAvatar} className="h-11 w-11" />
            <div className="mr-auto min-w-0">
              <p className="truncate font-semibold text-fg">{v.channelTitle}</p>
              {v.channel?.subs && <p className="text-xs text-muted">{compact(v.channel.subs)} subscribers</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={a.status === STATUS.WISHLIST ? 'soft' : 'surface'}
                icon={a.status === STATUS.WISHLIST ? 'check' : 'clock'}
                onClick={() => a.setStatus(STATUS.WISHLIST)}
              >
                Watch later
              </Button>
              <Button
                variant={a.status === STATUS.COMPLETED ? 'primary' : 'surface'}
                icon="checkCircle"
                onClick={() => a.setStatus(STATUS.COMPLETED)}
              >
                {a.status === STATUS.COMPLETED ? 'Watched' : 'Mark watched'}
              </Button>
              <FavoriteButton item={v} className="h-10 w-10" />
              <a
                href={`https://www.youtube.com/watch?v=${v.externalId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-ui bg-surface-2 px-4 text-sm font-semibold text-fg ring-1 ring-line hover:ring-accent-line"
              >
                <Icon name="external" className="h-4 w-4" /> YouTube
              </a>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-surface-2 p-4">
            <p className="text-sm font-bold text-fg">
              {[v.views != null ? `${v.views.toLocaleString()} views` : null, v.publishedAt ? `${formatDate(v.publishedAt)} (${timeAgo(v.publishedAt)})` : null, v.durationLabel]
                .filter(Boolean)
                .join('  ·  ')}
            </p>
            {v.likes ? <p className="mt-0.5 text-xs text-muted">{compact(v.likes)} likes</p> : null}
            <p className={cn('mt-3 whitespace-pre-line text-sm leading-relaxed text-fg-2', !expanded && 'line-clamp-4')}>{v.overview || 'No description.'}</p>
            {(v.overview?.length || 0) > 280 && (
              <button type="button" onClick={() => setExpanded((e) => !e)} className="mt-2 text-sm font-bold text-fg hover:underline">
                {expanded ? 'Show less' : '…more'}
              </button>
            )}
            {v.genres?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {v.genres.map((t) => (
                  <span key={t} className="text-xs font-semibold text-accent">
                    #{t.replace(/\s+/g, '')}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-2xl bg-surface p-5 ring-1 ring-line">
              <h3 className="font-display text-lg text-fg">Your rating</h3>
              <StarRatingInput value={stars} onRate={a.rate} size={26} className="mt-3" />
            </div>
            <ReviewBox item={v} className="rounded-2xl" />
          </div>
        </div>

        <aside className="space-y-8">
          {groups.map(([title, list]) => (
            <section key={title}>
              <h2 className="mb-3 text-base font-bold text-fg">{title}</h2>
              <div className="space-y-3">
                {list.map((x) => (
                  <VideoCard key={x.externalId} item={x} row />
                ))}
              </div>
            </section>
          ))}
          {(more.isLoading || latest.isLoading) && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
