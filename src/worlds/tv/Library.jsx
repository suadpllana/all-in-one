import { useState } from 'react'
import { Link } from 'react-router-dom'
import { STATUS } from '../../config/categories'
import { useItemActions } from '../../hooks/useItemActions'
import { cn } from '../../lib/cn'
import { gridClass } from '../../lib/grid'
import { detailPath } from '../../lib/paths'
import { getProgress } from '../../lib/progress'
import PosterCard from '../../components/cards/PosterCard'
import { Button } from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Img from '../../components/ui/Img'
import { ProgressBar } from '../../components/ui/Progress'
import { GridSkeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/States'
import StatusMenu from '../../components/library/StatusMenu'
import { useLibraryItems } from '../shared/library'
import LibraryToolbar, { Summary } from '../shared/LibraryToolbar'
import PickForMe from '../shared/PickForMe'

export default function TvLibrary({ category, tab, query }) {
  return (
    <div className="shell page-in py-8 md:py-12">
      {tab.key === 'progress' ? (
        <Watching category={category} query={query} />
      ) : (
        <ShowGrid category={category} tab={tab} query={query} />
      )}
    </div>
  )
}

function Header({ kicker, title, children }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="kicker text-accent">{kicker}</p>
        <h1 className="mt-2 font-display text-5xl text-fg md:text-6xl">{title}</h1>
      </div>
      {children}
    </header>
  )
}

/* ------------------------------------------------------------- watching */

function Watching({ category, query }) {
  const [sort, setSort] = useState('progress')
  const { all, items, isLoading } = useLibraryItems('tv', STATUS.IN_PROGRESS, query, sort)
  const totals = all.reduce(
    (acc, s) => {
      const p = getProgress(s)
      if (p?.total) acc.left += Math.max(0, p.total - p.current)
      acc.minutes += p?.total ? Math.max(0, p.total - p.current) * (s.runtime || 45) : 0
      return acc
    },
    { left: 0, minutes: 0 },
  )

  return (
    <>
      <Header kicker="Episode tracker" title="Currently Watching" />
      {isLoading ? (
        <GridSkeleton shape="wide" count={3} />
      ) : !all.length ? (
        <EmptyState icon="tv" title="No shows in progress" hint="Start a show and tick episodes off as you go — your next episode will always be one tap away.">
          <Button as={Link} to={category.route} variant="primary" icon="tv">
            Find a show
          </Button>
        </EmptyState>
      ) : (
        <>
          <LibraryToolbar
            summary={
              <Summary
                stats={[
                  { label: 'Shows', value: all.length },
                  { label: 'Episodes left', value: totals.left },
                  { label: 'To catch up', value: `${Math.round(totals.minutes / 60)}h` },
                ]}
              />
            }
            sorts={['progress', 'recent', 'az']}
            sort={sort}
            onSort={setSort}
          />
          <ol className="mt-8 grid grid-cols-1 gap-4 xl:grid-cols-2">
            {items.map((s) => (
              <TrackerRow key={s.externalId} item={s} />
            ))}
          </ol>
        </>
      )}
    </>
  )
}

function TrackerRow({ item }) {
  const a = useItemActions(item)
  const info = getProgress({ ...item, _progress: a.progress })
  const p = a.progress
  return (
    <li className="group grid grid-cols-[112px_1fr] items-center gap-4 rounded-card bg-surface p-3 ring-1 ring-line transition-colors hover:ring-accent-line sm:grid-cols-[208px_1fr] sm:gap-5 sm:p-4">
      <Link to={detailPath(item)} className="relative block overflow-hidden rounded-[10px]">
        <Img src={item.backdropUrl || item.posterUrl} title={item.title} className="aspect-video w-full" imgClassName="transition-transform duration-500 group-hover:scale-105" />
        {p?.season && (
          <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-bold text-white backdrop-blur">
            S{p.season} · E{p.episode}
          </span>
        )}
      </Link>
      <div className="min-w-0">
        {item.network && <p className="kicker text-[10px] text-accent">{item.network}</p>}
        <Link to={detailPath(item)} className="mt-0.5 block truncate font-display text-xl text-fg hover:text-accent">
          {item.title}
        </Link>
        <ProgressBar value={info?.pct ?? 0} className="mt-2.5" />
        <p className="mt-1.5 text-xs text-muted">{info?.detail}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="primary" icon="check" onClick={() => a.bump(1)}>
            Watched {info?.next}
          </Button>
          <Button size="sm" variant="ghost" icon="undo" onClick={() => a.bump(-1)} disabled={!p?.episode && (p?.season ?? 1) <= 1}>
            Undo
          </Button>
          <StatusMenu item={item} className="ml-auto" />
        </div>
      </div>
    </li>
  )
}

/* ------------------------------------------------------- watchlist/done */

function ShowGrid({ category, tab, query }) {
  const done = tab.status === STATUS.COMPLETED
  const [sort, setSort] = useState('recent')
  const { all, items, isLoading } = useLibraryItems('tv', tab.status, query, sort)
  const seasons = all.reduce((n, s) => n + (s.seasons || 0), 0)
  const episodes = all.reduce((n, s) => n + (s.episodes || 0), 0)
  const hours = Math.round(all.reduce((n, s) => n + (s.episodes || 0) * (s.runtime || 45), 0) / 60)

  return (
    <>
      <Header kicker={done ? 'All caught up' : 'Queued up'} title={done ? 'Finished Series' : 'Watchlist'}>
        {!done && (
          <PickForMe
            items={all}
            label="Pick my next show"
            heading="Your next binge"
            wide
            describe={(s) => [s.network, s.seasons ? `${s.seasons} seasons` : null, s.episodes ? `${s.episodes} episodes` : null].filter(Boolean).join(' · ')}
          />
        )}
      </Header>
      {isLoading ? (
        <GridSkeleton />
      ) : !all.length ? (
        <EmptyState
          icon={done ? 'checkCircle' : 'bookmark'}
          title={done ? 'No finished shows yet' : 'Your watchlist is empty'}
          hint={done ? 'When you watch the last episode of a show, it lands here.' : 'Save shows you want to start — they’ll wait here.'}
        >
          <Button as={Link} to={category.route} variant="primary" icon="tv">
            Browse shows
          </Button>
        </EmptyState>
      ) : (
        <>
          <LibraryToolbar
            summary={
              <Summary
                stats={[
                  { label: 'Shows', value: all.length },
                  seasons ? { label: 'Seasons', value: seasons } : null,
                  episodes ? { label: 'Episodes', value: episodes } : null,
                  hours ? { label: done ? 'Hours watched' : 'Hours to watch', value: hours } : null,
                ]}
              />
            }
            sorts={done ? ['recent', 'myRating', 'rating', 'newest', 'az'] : ['recent', 'rating', 'newest', 'az']}
            sort={sort}
            onSort={setSort}
          />
          <div className={cn(gridClass('poster'), 'mt-8')}>
            {items.map((s) => (
              <PosterCard
                key={s.externalId}
                item={s}
                size="fill"
                meta={[s.seasons ? `${s.seasons} season${s.seasons > 1 ? 's' : ''}` : s.year, s.network].filter(Boolean).join(' · ')}
                topLeft={
                  s._favorite ? (
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-black/60 text-rose-400 backdrop-blur">
                      <Icon name="heartFill" className="h-3.5 w-3.5" />
                    </span>
                  ) : null
                }
              />
            ))}
          </div>
        </>
      )}
    </>
  )
}
