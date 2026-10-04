import { useState } from 'react'
import { Link } from 'react-router-dom'
import { anime } from '../../api/anime'
import { STATUS } from '../../config/categories'
import { useWorldQuery } from '../../hooks/useDiscover'
import { useItemActions } from '../../hooks/useItemActions'
import { cn } from '../../lib/cn'
import { gridClass } from '../../lib/grid'
import { detailPath } from '../../lib/paths'
import { getProgress } from '../../lib/progress'
import { toStars } from '../../lib/rating'
import { NoteSlot } from '../../components/library/NoteEditor'
import StatusMenu from '../../components/library/StatusMenu'
import { Button, IconButton } from '../../components/ui/Button'
import Img from '../../components/ui/Img'
import { ProgressBar } from '../../components/ui/Progress'
import { GridSkeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/States'
import { StarRatingInput } from '../../components/ui/Stars'
import { useLibraryItems } from '../shared/library'
import LibraryToolbar, { Summary } from '../shared/LibraryToolbar'
import PickForMe from '../shared/PickForMe'
import { formatLine, useAiring } from './lib'
import { AnimeCard } from './parts'

export default function AnimeLibrary({ category, tab, query }) {
  const [sort, setSort] = useState(tab.key === 'progress' ? 'progress' : 'recent')
  const { all, items: rows, isLoading } = useLibraryItems('anime', tab.status, query, sort)
  // Series you're watching get live airing info (next episode countdown,
  // updated episode totals) in one batched request.
  const ids = tab.key === 'progress' ? all.map((a) => a.externalId).sort() : []
  const airing = useWorldQuery(['anime-airing', ...ids], (signal) => anime.airing(ids, signal), {
    enabled: ids.length > 0,
    staleTime: 10 * 60 * 1000,
  })
  const items = rows.map((a) => {
    const live = airing.data?.[a.externalId]
    return live ? { ...a, nextAiring: live.nextAiring, episodes: live.episodes || a.episodes } : a
  })
  const eps = all.reduce((n, a) => n + (tab.status === STATUS.COMPLETED ? a.episodes || 12 : a._progress?.episode || 0), 0)
  const minutes = all.reduce(
    (n, a) => n + (tab.status === STATUS.COMPLETED ? (a.episodes || 12) : tab.status === STATUS.WISHLIST ? a.episodes || 12 : a._progress?.episode || 0) * (a.runtime || 24),
    0,
  )
  const titles = {
    plan: ['Queue', 'Plan to Watch'],
    progress: ['Episode tracker', 'Watching'],
    done: ['Your record', 'Completed'],
  }[tab.key]

  return (
    <div className="shell page-in py-8 md:py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="kicker text-accent">{titles[0]}</p>
          <h1 className="mt-2 font-display text-5xl text-fg md:text-6xl">{titles[1]}</h1>
        </div>
        {tab.key === 'plan' && (
          <PickForMe items={all} label="Pick my next series" heading="Your next series" describe={(a) => formatLine(a)} />
        )}
      </header>

      {isLoading ? (
        <GridSkeleton />
      ) : !all.length ? (
        <EmptyState
          icon="sakura"
          title={tab.key === 'progress' ? 'Nothing on the go' : tab.key === 'done' ? 'No completed series yet' : 'Your queue is empty'}
          hint="Browse the seasonal chart and add what catches your eye — progress is tracked episode by episode."
        >
          <Button as={Link} to={category.route} variant="primary" icon="sakura">
            Open the seasonal chart
          </Button>
        </EmptyState>
      ) : (
        <>
          <LibraryToolbar
            summary={
              <Summary
                stats={[
                  { label: 'Series', value: all.length },
                  { label: tab.key === 'plan' ? 'Episodes queued' : 'Episodes', value: eps },
                  // MyAnimeList's classic stat.
                  { label: tab.key === 'plan' ? 'Days to watch' : 'Days watched', value: (minutes / 1440).toFixed(1) },
                ]}
              />
            }
            sorts={tab.key === 'progress' ? ['progress', 'az', 'rating'] : tab.key === 'done' ? ['recent', 'myRating', 'rating', 'az'] : ['recent', 'rating', 'newest', 'az']}
            sort={sort}
            onSort={setSort}
          />
          {tab.key === 'plan' ? (
            <div className={cn(gridClass('poster'), 'mt-8')}>
              {items.map((a) => (
                <AnimeCard key={a.externalId} item={a} size="fill" />
              ))}
            </div>
          ) : (
            <ol className="mt-8 overflow-hidden rounded-card bg-surface ring-1 ring-line">
              <li className="hidden grid-cols-[60px_1fr_180px_150px] gap-4 border-b border-line px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted md:grid">
                <span />
                <span>Title</span>
                <span>Progress</span>
                <span className="text-right">Your score</span>
              </li>
              {items.map((a) => (
                <ListRow key={a.externalId} item={a} completed={tab.key === 'done'} />
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  )
}

function ListRow({ item, completed }) {
  const a = useItemActions(item)
  const info = getProgress({ ...item, _progress: a.progress })
  const airing = useAiring(item)
  const stars = a.userRating != null ? toStars(a.userRating) : null
  return (
    <li className="grid grid-cols-[52px_1fr] items-center gap-x-4 gap-y-3 border-b border-line/70 px-4 py-3 last:border-0 md:grid-cols-[60px_1fr_180px_150px]">
      <Link to={detailPath(item)} className="row-span-2 md:row-span-1">
        <Img src={item.posterUrl} title={item.title} className="aspect-[2/3] w-full rounded-lg" />
      </Link>
      <div className="min-w-0">
        <Link to={detailPath(item)} className="block truncate text-[15px] font-bold text-fg hover:text-accent">
          {item.title}
        </Link>
        <p className="truncate text-xs text-muted">{formatLine(item)}</p>
        {completed && <NoteSlot item={item} className="mt-1.5" />}
        {airing && (
          <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-bold text-accent">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" /> Ep {airing.episode} in {airing.in}
          </p>
        )}
      </div>
      <div className="min-w-0">
        {completed ? (
          <p className="text-sm font-semibold text-fg-2">{item.episodes ? `${item.episodes} / ${item.episodes}` : 'Completed'}</p>
        ) : (
          <div className="flex items-center gap-2">
            <IconButton icon="minus" label="One episode back" size="sm" variant="surface" onClick={() => a.bump(-1)} disabled={!a.progress?.episode} />
            <span className="min-w-16 text-center text-sm font-bold tabular-nums text-fg">
              {a.progress?.episode || 0}
              <span className="text-muted"> / {item.episodes || '?'}</span>
            </span>
            <IconButton icon="plus" label="Watched next episode" size="sm" variant="primary" onClick={() => a.bump(1)} />
          </div>
        )}
        <ProgressBar value={completed ? 1 : (info?.pct ?? 0)} className="mt-2" />
      </div>
      <div className="flex items-center gap-2 md:justify-end">
        <StarRatingInput value={stars} onRate={a.rate} size={17} />
        <StatusMenu item={item} className="ml-auto md:ml-0" />
      </div>
    </li>
  )
}
