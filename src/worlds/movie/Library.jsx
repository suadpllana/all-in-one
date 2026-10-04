import { useState } from 'react'
import { Link } from 'react-router-dom'
import { STATUS } from '../../config/categories'
import { usePref } from '../../hooks/usePref'
import { cn } from '../../lib/cn'
import { formatMinutes } from '../../lib/duration'
import { toDate } from '../../lib/format'
import { genreLabels } from '../../lib/genres'
import { gridClass } from '../../lib/grid'
import { detailPath } from '../../lib/paths'
import { toStars } from '../../lib/rating'
import PosterCard from '../../components/cards/PosterCard'
import { NoteSlot } from '../../components/library/NoteEditor'
import { Button } from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Img from '../../components/ui/Img'
import { GridSkeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/States'
import { Stars } from '../../components/ui/Stars'
import { useLibraryItems } from '../shared/library'
import LibraryToolbar, { Summary } from '../shared/LibraryToolbar'
import PickForMe from '../shared/PickForMe'

export default function MovieLibrary({ category, tab, query }) {
  return (
    <div className="shell page-in py-8 md:py-12">
      {tab.key === 'plan' ? <Watchlist category={category} query={query} /> : <Diary category={category} query={query} />}
    </div>
  )
}

function Header({ kicker, title, children }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="kicker text-accent">{kicker}</p>
        <h1 className="display mt-2 text-6xl text-fg md:text-7xl">{title}</h1>
      </div>
      {children}
    </header>
  )
}

/* ------------------------------------------------------------ watchlist */

function Watchlist({ category, query }) {
  const [sort, setSort] = useState('recent')
  const [genre, setGenre] = useState(null)
  const { all, items, isLoading } = useLibraryItems('movie', STATUS.WISHLIST, query, sort)
  const shown = genre ? items.filter((m) => genreLabels(m, 5).includes(genre)) : items
  const minutes = all.reduce((n, m) => n + (m.runtime || 0), 0)
  const genres = topGenres(all)

  return (
    <>
      <Header kicker="Your watchlist" title="Films To See">
        <PickForMe
          items={all}
          label="Pick tonight’s film"
          heading="Tonight’s feature"
          describe={(m) => [m.year, formatMinutes(m.runtime), genreLabels(m, 2).join(', ')].filter(Boolean).join(' · ')}
        />
      </Header>
      {isLoading ? (
        <GridSkeleton />
      ) : !all.length ? (
        <EmptyState icon="bookmark" title="Your watchlist is empty" hint="Tap the bookmark on any film to save it for later — it’ll wait for you here.">
          <Button as={Link} to={category.route} variant="primary" icon="film">
            Discover films
          </Button>
        </EmptyState>
      ) : (
        <>
          <LibraryToolbar
            summary={
              <Summary
                stats={[
                  { label: 'Films', value: all.length },
                  minutes ? { label: 'Screen time', value: formatMinutes(minutes) } : null,
                  { label: 'Longest wait', value: waitLabel(all) },
                ]}
              />
            }
            sorts={['recent', 'shortest', 'rating', 'newest', 'oldest', 'az']}
            sort={sort}
            onSort={setSort}
          />
          {genres.length > 1 && (
            <div className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
              <GenreChip active={!genre} onClick={() => setGenre(null)}>
                All
              </GenreChip>
              {genres.map(([g, n]) => (
                <GenreChip key={g} active={genre === g} onClick={() => setGenre(genre === g ? null : g)}>
                  {g} <span className="opacity-60">{n}</span>
                </GenreChip>
              ))}
            </div>
          )}
          <div className={cn(gridClass('poster'), 'mt-8')}>
            {shown.map((m) => (
              <PosterCard key={m.externalId} item={m} size="fill" />
            ))}
          </div>
          {!shown.length && <p className="py-10 text-center text-sm text-muted">No films match.</p>}
        </>
      )}
    </>
  )
}

function GenreChip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'h-8 shrink-0 rounded-full px-3.5 text-[13px] font-semibold transition-colors',
        active ? 'bg-fg text-bg' : 'bg-surface-2 text-fg-2 ring-1 ring-line hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}

function topGenres(items) {
  const counts = new Map()
  for (const m of items) for (const g of genreLabels(m, 5)) counts.set(g, (counts.get(g) || 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
}

function waitLabel(items) {
  const oldest = items.reduce((min, m) => (!min || (m._addedAt && m._addedAt < min) ? m._addedAt : min), null)
  if (!oldest) return '—'
  const days = Math.max(0, Math.round((Date.now() - new Date(oldest).getTime()) / 86400000))
  return days < 1 ? 'Today' : days < 60 ? `${days}d` : `${Math.round(days / 30)}mo`
}

/* ---------------------------------------------------------------- diary */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function Diary({ category, query }) {
  const [view, setView] = usePref('movie.diaryView', 'diary')
  const [sort, setSort] = useState('recent')
  const { all, items, isLoading } = useLibraryItems('movie', STATUS.COMPLETED, query, view === 'diary' ? 'recent' : sort)
  const minutes = all.reduce((n, m) => n + (m.runtime || 115), 0)
  const year = new Date().getFullYear()
  const thisYear = all.filter((m) => toDate(m._completedAt)?.getFullYear() === year).length
  const rated = all.filter((m) => m._userRating != null)
  const avg = rated.length ? rated.reduce((n, m) => n + toStars(m._userRating), 0) / rated.length : null

  return (
    <>
      <Header kicker="Your film diary" title="Diary" />
      {isLoading ? (
        <GridSkeleton />
      ) : !all.length ? (
        <EmptyState icon="eye" title="No films logged yet" hint="Mark a film as watched and it lands here, dated — your own film diary.">
          <Button as={Link} to={category.route} variant="primary" icon="film">
            Find something to watch
          </Button>
        </EmptyState>
      ) : (
        <>
          <LibraryToolbar
            summary={
              <Summary
                stats={[
                  { label: 'Films', value: all.length },
                  { label: `In ${year}`, value: thisYear },
                  { label: 'Hours', value: Math.round(minutes / 60) },
                  avg != null ? { label: 'Avg rating', value: `${avg.toFixed(1)}★` } : null,
                ]}
              />
            }
            sorts={view === 'grid' ? ['recent', 'myRating', 'rating', 'newest', 'az'] : null}
            sort={sort}
            onSort={setSort}
            view={view}
            onView={setView}
            views={[
              { key: 'diary', label: 'Diary', icon: 'list' },
              { key: 'grid', label: 'Posters', icon: 'grid' },
            ]}
          />
          {view === 'grid' ? (
            <div className={cn(gridClass('poster'), 'mt-8')}>
              {items.map((m) => (
                <div key={m.externalId}>
                  <PosterCard item={m} size="fill" />
                  <NoteSlot item={m} compact className="mt-2" />
                </div>
              ))}
            </div>
          ) : (
            <DiaryList items={items} />
          )}
        </>
      )}
    </>
  )
}

function DiaryList({ items }) {
  const months = []
  for (const m of items) {
    const d = toDate(m._completedAt || m._updatedAt) || new Date()
    const key = `${d.getFullYear()}-${d.getMonth()}`
    let group = months.at(-1)
    if (!group || group.key !== key) {
      group = { key, label: d.toLocaleString('en', { month: 'long', year: 'numeric' }), items: [] }
      months.push(group)
    }
    group.items.push({ m, d })
  }
  return (
    <div className="mt-8 space-y-10">
      {months.map((g) => (
        <section key={g.key}>
          <h2 className="sticky top-[104px] z-10 -mx-2 mb-2 flex items-baseline gap-3 bg-bg/90 px-2 py-2 backdrop-blur md:top-[116px]">
            <span className="display text-3xl text-accent">{g.label}</span>
            <span className="text-sm text-muted">{g.items.length} film{g.items.length === 1 ? '' : 's'}</span>
          </h2>
          <ol className="divide-y divide-line">
            {g.items.map(({ m, d }) => (
              <li
                key={m.externalId}
                className="group relative grid grid-cols-[52px_44px_1fr] items-center gap-4 rounded-card px-2 py-3 transition-colors hover:bg-surface sm:grid-cols-[64px_52px_1fr_auto]"
              >
                <span className="text-center">
                  <span className="display block text-4xl leading-none text-fg">{d.getDate()}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{WEEKDAYS[d.getDay()]}</span>
                </span>
                <Img src={m.posterUrl} title={m.title} className="aspect-[2/3] w-full rounded-[4px] ring-1 ring-line" />
                <div className="min-w-0">
                  <Link to={detailPath(m)} className="block truncate text-[15px] font-semibold text-fg after:absolute after:inset-0 group-hover:text-accent">
                    {m.title} <span className="font-normal text-muted">{m.year}</span>
                  </Link>
                  {!m._review && (
                    <p className="mt-0.5 truncate text-sm text-muted">
                      {[formatMinutes(m.runtime), genreLabels(m, 2).join(', ')].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <NoteSlot item={m} className="mt-1" />
                  <p className="mt-1.5 flex items-center gap-2 sm:hidden">
                    <DiaryMarks m={m} />
                  </p>
                </div>
                <span className="hidden items-center gap-3 sm:flex">
                  <DiaryMarks m={m} />
                </span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}

function DiaryMarks({ m }) {
  const stars = toStars(m._userRating)
  return (
    <>
      {stars != null ? <Stars value={stars} size={15} /> : <span className="text-xs text-muted">Not rated</span>}
      {m._favorite && <Icon name="heartFill" className="h-4 w-4 text-rose-500" />}
    </>
  )
}
