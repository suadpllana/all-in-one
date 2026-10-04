import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { STATUS } from '../../config/categories'
import { useItemActions } from '../../hooks/useItemActions'
import { cn } from '../../lib/cn'
import { formatMinutes } from '../../lib/duration'
import { gridClass } from '../../lib/grid'
import { compact, timeAgo } from '../../lib/format'
import { detailPath } from '../../lib/paths'
import { toStars } from '../../lib/rating'
import VideoCard from '../../components/cards/VideoCard'
import { NoteSlot } from '../../components/library/NoteEditor'
import { Button, IconButton } from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Img from '../../components/ui/Img'
import { GridSkeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/States'
import { Stars } from '../../components/ui/Stars'
import { SORTS, useLibraryItems } from '../shared/library'
import LibraryToolbar, { Summary } from '../shared/LibraryToolbar'

const QUEUE_SORTS = ['recent', 'shortest', 'az']

export default function YouTubeLibrary({ category, tab, query }) {
  const [sort, setSort] = useState('recent')
  const { all, items, isLoading } = useLibraryItems('youtube', tab.status, query, sort)
  const minutes = all.reduce((n, v) => n + (v.runtime || 0), 0)
  const queue = tab.key === 'plan'

  if (isLoading) {
    return (
      <div className="shell py-8 md:py-12">
        <GridSkeleton shape="video" count={8} />
      </div>
    )
  }
  if (!all.length) {
    return (
      <div className="shell page-in py-8 md:py-12">
        <EmptyState
          icon={queue ? 'clock' : 'play'}
          title={queue ? 'Your Watch Later is empty' : tab.key === 'done' ? 'No watch history yet' : 'Nothing in progress'}
          hint="Save long-form essays and podcasts here, then come back when you have the time for them."
        >
          <Button as={Link} to={category.route} variant="primary" icon="play">
            Find something to watch
          </Button>
        </EmptyState>
      </div>
    )
  }
  if (queue) return <Queue all={all} items={items} minutes={minutes} sort={sort} onSort={setSort} />

  const done = tab.key === 'done'
  return (
    <div className="shell page-in py-8 md:py-12">
      <header className="mb-8">
        <p className="kicker text-accent">{done ? 'History' : 'In progress'}</p>
        <h1 className="mt-2 font-display text-5xl text-fg md:text-6xl">{tab.label}</h1>
      </header>
      <LibraryToolbar
        summary={
          <Summary
            stats={[
              { label: 'Videos', value: all.length },
              minutes ? { label: done ? 'Watched' : 'Runtime', value: formatMinutes(minutes) } : null,
            ]}
          />
        }
        sorts={['recent', 'myRating', 'az']}
        sort={sort}
        onSort={setSort}
      />
      <div className={cn(gridClass('video'), 'mt-8')}>
        {items.map((v) => (
          <div key={v.externalId}>
            <VideoCard item={v} meta={done && v._completedAt ? `Watched ${timeAgo(v._completedAt)}` : undefined} />
            {toStars(v._userRating) != null && <Stars value={toStars(v._userRating)} size={13} className="ml-12 mt-1.5" />}
            {done && <NoteSlot item={v} compact className="ml-12 mt-1.5 w-[calc(100%-3rem)]" />}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ the queue */

// Watch Later as a playlist: a cover panel (the first video, its colours
// washed across the panel) with Play all / Shuffle, and the numbered queue.
function Queue({ all, items, minutes, sort, onSort }) {
  const navigate = useNavigate()
  const first = items[0] || all[0]
  const updated = all.reduce((latest, v) => (v._updatedAt > latest ? v._updatedAt : latest), '')
  const shuffle = () => navigate(detailPath(all[Math.floor(Math.random() * all.length)]))

  return (
    <div className="shell page-in py-6 md:py-10">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-start">
        <section className="relative overflow-hidden rounded-3xl p-5 ring-1 ring-line lg:sticky lg:top-[136px]">
          <img
            src={first.backdropUrl || first.posterUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full scale-150 object-cover opacity-70 blur-3xl"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-bg/70 to-bg" />
          <div className="relative">
            <Link to={detailPath(first)} className="group relative block overflow-hidden rounded-2xl shadow-2xl">
              <Img src={first.backdropUrl || first.posterUrl} title={first.title} className="aspect-video w-full" />
              <span className="absolute inset-0 grid place-items-center bg-black/0 text-sm font-bold text-white opacity-0 transition-all group-hover:bg-black/50 group-hover:opacity-100">
                <span className="flex items-center gap-2">
                  <Icon name="playFill" className="h-5 w-5" /> Play all
                </span>
              </span>
            </Link>
            <p className="kicker mt-6 text-accent">Your queue</p>
            <h1 className="mt-1 font-display text-4xl text-fg">Watch Later</h1>
            <dl className="mt-4 flex gap-6">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Videos</dt>
                <dd className="mt-0.5 text-2xl font-bold text-fg">{all.length}</dd>
              </div>
              {minutes > 0 && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Total runtime</dt>
                  <dd className="mt-0.5 text-2xl font-bold text-fg">{formatMinutes(minutes)}</dd>
                </div>
              )}
            </dl>
            {updated && <p className="mt-3 text-xs text-muted">Updated {timeAgo(updated)}</p>}
            <div className="mt-5 flex gap-2">
              <Button as={Link} to={detailPath(first)} variant="light" icon="playFill" className="flex-1">
                Play all
              </Button>
              <Button variant="glass" icon="shuffle" onClick={shuffle} className="flex-1">
                Shuffle
              </Button>
            </div>
          </div>
        </section>

        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-muted">
              {items.length === all.length ? `${all.length} videos` : `${items.length} of ${all.length} videos`}
            </p>
            <label className="relative flex items-center">
              <span className="sr-only">Sort by</span>
              <Icon name="sort" className="pointer-events-none absolute left-3 h-4 w-4 text-muted" />
              <select
                value={sort}
                onChange={(e) => onSort(e.target.value)}
                className="h-9 appearance-none rounded-ui bg-surface-2 pl-9 pr-8 text-sm font-semibold text-fg outline-none ring-1 ring-line focus:ring-2 focus:ring-accent"
              >
                {QUEUE_SORTS.map((s) => (
                  <option key={s} value={s}>
                    {SORTS[s].label}
                  </option>
                ))}
              </select>
              <Icon name="chevronDown" className="pointer-events-none absolute right-2.5 h-4 w-4 text-muted" />
            </label>
          </div>
          {items.length ? (
            <ol className="space-y-1">
              {items.map((v, i) => (
                <QueueRow key={v.externalId} item={v} index={i} />
              ))}
            </ol>
          ) : (
            <p className="rounded-2xl bg-surface p-6 text-sm text-muted">No videos in your queue match that filter.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function QueueRow({ item, index }) {
  const a = useItemActions(item)
  const duration = item.durationLabel || (item.runtime ? formatMinutes(item.runtime) : null)
  const meta = [item.channelTitle, item.views != null ? `${compact(item.views)} views` : null, item.publishedAt ? timeAgo(item.publishedAt) : null]
  return (
    <li className="group relative flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-surface sm:gap-4 sm:pr-3">
      <span className="hidden w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-muted sm:block">{index + 1}</span>
      <div className="relative w-36 shrink-0 overflow-hidden rounded-xl sm:w-44">
        <Img src={item.backdropUrl || item.posterUrl} title={item.title} className="aspect-video w-full" />
        {duration && (
          <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-px text-[11px] font-semibold tabular-nums text-white">{duration}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <Link to={detailPath(item)} className="line-clamp-2 font-semibold leading-snug text-fg after:absolute after:inset-0">
          {item.title}
        </Link>
        <p className="mt-1 truncate text-[13px] text-muted">{meta.filter(Boolean).join(' · ')}</p>
      </div>
      <div className="relative z-10 flex shrink-0 flex-col gap-1 sm:flex-row md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:focus-within:opacity-100">
        <IconButton icon="check" label="Mark as watched" size="sm" variant="surface" onClick={() => a.setStatus(STATUS.COMPLETED)} />
        <IconButton icon="trash" label="Remove from Watch Later" size="sm" variant="surface" onClick={a.remove} />
      </div>
    </li>
  )
}
