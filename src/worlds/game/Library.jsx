import { useState } from 'react'
import { Link } from 'react-router-dom'
import { rawgThumb } from '../../api/rawg'
import { STATUS } from '../../config/categories'
import { useItemActions } from '../../hooks/useItemActions'
import { cn } from '../../lib/cn'
import { scoreTone } from '../../lib/format'
import { genreLabels } from '../../lib/genres'
import { gridClass } from '../../lib/grid'
import { detailPath } from '../../lib/paths'
import { formatHours, getProgress } from '../../lib/progress'
import GameCard from '../../components/cards/GameCard'
import Platforms from '../../components/cards/Platforms'
import { Button, IconButton } from '../../components/ui/Button'
import Img from '../../components/ui/Img'
import { ProgressBar } from '../../components/ui/Progress'
import { GridSkeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/States'
import { useLibraryItems } from '../shared/library'
import LibraryToolbar, { Summary } from '../shared/LibraryToolbar'
import PickForMe from '../shared/PickForMe'

export default function GameLibrary({ category, tab, query }) {
  return (
    <div className="shell page-in py-8 md:py-12">
      {tab.key === 'progress' ? <NowPlaying category={category} query={query} /> : <Collection category={category} tab={tab} query={query} />}
    </div>
  )
}

function Header({ kicker, title, children }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-accent">// {kicker}</p>
        <h1 className="display mt-2 text-5xl text-fg md:text-6xl">{title}</h1>
      </div>
      {children}
    </header>
  )
}

function Empty({ category, title, hint }) {
  return (
    <EmptyState icon="gamepad" title={title} hint={hint}>
      <Button as={Link} to={category.route} variant="primary" icon="gamepad">
        Find a game
      </Button>
    </EmptyState>
  )
}

/* ---------------------------------------------------------- now playing */

function NowPlaying({ category, query }) {
  const { all, items, isLoading } = useLibraryItems('game', STATUS.IN_PROGRESS, query, 'progress')
  const hours = all.reduce((n, g) => n + (g._progress?.hours || 0), 0)
  return (
    <>
      <Header kicker="Active session" title="Now Playing" />
      {isLoading ? (
        <GridSkeleton shape="wide" count={3} />
      ) : !all.length ? (
        <Empty category={category} title="Nothing on the go" hint="Start a game and log hours as you play — Vault shows how far you are against its average time to beat." />
      ) : (
        <>
          <Summary stats={[{ label: 'Games', value: all.length }, { label: 'Hours logged', value: formatHours(Math.round(hours * 10) / 10) }]} />
          <div className="mt-8 grid grid-cols-1 gap-5 xl:grid-cols-2">
            {items.map((g) => (
              <SessionCard key={g.externalId} item={g} />
            ))}
          </div>
        </>
      )}
    </>
  )
}

function SessionCard({ item }) {
  const a = useItemActions(item)
  const info = getProgress({ ...item, _progress: a.progress })
  return (
    <article className="chamfer group grid grid-cols-1 bg-surface ring-1 ring-line sm:grid-cols-[240px_1fr]">
      <Link to={detailPath(item)} className="relative block overflow-hidden">
        <Img src={rawgThumb(item.backdropUrl, 640)} fallbackSrc={item.backdropUrl} title={item.title} className="aspect-video h-full w-full" imgClassName="transition-transform duration-500 group-hover:scale-105" />
        {item.metacritic != null && (
          <span className={cn('absolute left-2.5 top-2.5 px-1.5 py-1 font-display text-sm leading-none', scoreTone(item.metacritic))}>{item.metacritic}</span>
        )}
      </Link>
      <div className="min-w-0 p-5">
        <Link to={detailPath(item)} className="block truncate font-display text-xl uppercase text-fg hover:text-accent">
          {item.title}
        </Link>
        <div className="mt-1.5 flex items-center gap-2">
          <Platforms platforms={item.platforms} />
          <span className="truncate text-xs text-muted">{genreLabels(item, 2).join(' · ')}</span>
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <p className="font-display text-3xl leading-none text-fg">
            {formatHours(a.progress?.hours || 0)}
            <span className="ml-1.5 text-sm text-muted">{item.playtime ? `/ ~${item.playtime}h to beat` : 'played'}</span>
          </p>
          <span className="font-mono text-xs font-bold text-accent">{info?.pct != null ? `${Math.round(info.pct * 100)}%` : ''}</span>
        </div>
        <ProgressBar value={info?.pct ?? 0} className="mt-2 h-2 rounded-none [&>div]:rounded-none" />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <IconButton icon="minus" label="Remove an hour" size="sm" variant="surface" onClick={() => a.bump(-1)} disabled={!a.progress?.hours} className="rounded-none" />
          <Button size="sm" variant="primary" icon="plus" onClick={() => a.bump(1)} className="rounded-none">
            1 hour
          </Button>
          <Button size="sm" variant="surface" onClick={() => a.bump(5)} className="rounded-none">
            +5h
          </Button>
          <Button size="sm" variant="ghost" icon="trophy" onClick={() => a.setStatus(STATUS.COMPLETED)} className="ml-auto rounded-none">
            Beat it
          </Button>
        </div>
      </div>
    </article>
  )
}

/* ------------------------------------------------------ backlog / played */

function Collection({ category, tab, query }) {
  const played = tab.status === STATUS.COMPLETED
  const [sort, setSort] = useState('recent')
  const { all, items, isLoading } = useLibraryItems('game', tab.status, query, sort)
  const hours = all.reduce((n, g) => n + (played ? g._progress?.hours || g.playtime || 0 : g.playtime || 0), 0)

  return (
    <>
      <Header kicker={played ? 'Hall of beaten games' : 'The pile of shame'} title={played ? 'Played' : 'Backlog'}>
        {!played && (
          <PickForMe
            items={all}
            label="Pick my next game"
            heading="Next up"
            wide
            describe={(g) => [g.playtime ? `~${g.playtime}h to beat` : null, genreLabels(g, 2).join(', ')].filter(Boolean).join(' · ')}
          />
        )}
      </Header>
      {isLoading ? (
        <GridSkeleton shape="wide" />
      ) : !all.length ? (
        <Empty
          category={category}
          title={played ? 'Nothing beaten yet' : 'Backlog clear'}
          hint={played ? 'When you finish a game, it goes up here.' : 'Add games you mean to play — Vault will total up how many hours your backlog really is.'}
        />
      ) : (
        <>
          <LibraryToolbar
            summary={
              <Summary
                stats={[
                  { label: 'Games', value: all.length },
                  hours ? { label: played ? 'Hours played' : 'Hours to beat', value: `~${Math.round(hours)}h` } : null,
                  hours && !played ? { label: 'Nonstop', value: `${(hours / 24).toFixed(1)} days` } : null,
                ]}
              />
            }
            sorts={played ? ['recent', 'myRating', 'rating', 'az'] : ['recent', 'playtime', 'rating', 'newest', 'az']}
            sort={sort}
            onSort={setSort}
          />
          <div className={cn(gridClass('wide'), 'mt-8')}>
            {items.map((g) => (
              <GameCard key={g.externalId} item={g} size="fill" />
            ))}
          </div>
        </>
      )}
    </>
  )
}
