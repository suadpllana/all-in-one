import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ANIME_GENRES, anime, currentSeason, FORMAT_LABEL, shiftSeason, SOURCE_LABEL } from '../../api/anime'
import { STATUS } from '../../config/categories'
import { useRecommended, useSection, useWorldQuery } from '../../hooks/useDiscover'
import { useItemActions } from '../../hooks/useItemActions'
import { useNow } from '../../hooks/useNow'
import { cn } from '../../lib/cn'
import { gridClass } from '../../lib/grid'
import { detailPath } from '../../lib/paths'
import QuickActions from '../../components/library/QuickActions'
import { Button, IconButton } from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Img from '../../components/ui/Img'
import { SectionHeader } from '../../components/ui/Section'
import { GridSkeleton, HeroSkeleton, Skeleton } from '../../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../../components/ui/States'
import { LazyTrailerButton } from '../shared/Detail'
import Shelf from '../shared/Shelf'
import { useCarousel } from '../shared/useCarousel'
import { formatLine, useAiring } from './lib'
import { AnimeCard, GenreChip, Petals, ScorePill } from './parts'

const SEASON_NAME = { WINTER: 'Winter', SPRING: 'Spring', SUMMER: 'Summer', FALL: 'Fall' }

// Anime — "the seasonal chart". Banner hero with key art, this season's
// chart with airing countdowns, a weekly broadcast schedule, trending, the
// all-time top list and genre chips.
export default function AnimeDiscover() {
  const [params, setParams] = useSearchParams()
  const genre = params.get('genre')
  const trending = useSection('anime', 'trending')
  const top = useSection('anime', 'topRated')
  const recommended = useRecommended('anime')

  return (
    <div className="pb-4">
      <AnimeHero query={trending} />
      <div className="shell relative z-10 mt-4 space-y-16">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
          {ANIME_GENRES.map((g) => (
            <GenreChip
              key={g}
              name={g}
              active={genre === g}
              onClick={() => setParams(genre === g ? {} : { genre: g })}
            />
          ))}
        </div>
        {genre ? (
          <GenreGrid genre={genre} onClose={() => setParams({})} />
        ) : (
          <>
            <SeasonChart />
            <Schedule />
            <Shelf
              kicker="Everyone’s talking about"
              title="Trending Now"
              query={trending}
              render={(a) => <AnimeCard key={a.externalId} rail item={a} />}
            />
            <TopList query={top} />
            <Shelf
              kicker="Picked from your list"
              title="Recommended For You"
              query={recommended}
              hideWhenEmpty
              render={(a) => <AnimeCard key={a.externalId} rail item={a} />}
            />
          </>
        )}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- hero */

function AnimeHero({ query }) {
  const { data, isLoading, error, refetch } = query
  const slides = (data || []).slice(0, 5)
  const c = useCarousel(slides.length, { interval: 8000 })
  if (isLoading) return <HeroSkeleton className="under-bars h-[78vh]" />
  if (error) return <div className="shell pt-10"><ErrorState error={error} onRetry={refetch} /></div>
  if (!slides.length) return null
  const a = slides[c.index]
  const glow = a.color || 'var(--accent)'

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Trending anime"
      onMouseEnter={() => c.setPaused(true)}
      onMouseLeave={() => c.setPaused(false)}
      className="under-bars relative min-h-[680px] overflow-hidden md:h-[84vh] md:max-h-[860px]"
    >
      {slides.map((s, i) => (
        <img
          key={s.externalId}
          src={s.backdropUrl || s.posterUrl}
          alt=""
          aria-hidden
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-1000',
            s.backdropUrl ? 'opacity-45' : 'scale-110 opacity-30 blur-2xl',
            i !== c.index && '!opacity-0',
          )}
        />
      ))}
      <div className="absolute inset-0 transition-[background] duration-1000" style={{ background: `radial-gradient(circle at 72% 45%, color-mix(in srgb, ${glow} 38%, transparent), transparent 62%)` }} />
      <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/80 to-bg/10" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg to-transparent" />
      <Petals />

      <div className="shell relative flex h-full min-h-[680px] items-end gap-10 pb-16 pt-36 md:items-center md:pb-10">
        <div key={a.externalId} className="rise min-w-0 max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-accent">
            <Icon name="flame" className="h-4 w-4" /> #{c.index + 1} trending
            {a.season && a.year ? <span className="text-fg-2">· {SEASON_NAME[a.season]} {a.year}</span> : null}
          </p>
          <h1 className="mt-4 font-display text-[2.8rem] leading-[1.02] text-fg md:text-6xl xl:text-7xl">{a.title}</h1>
          {a.titleRomaji && a.titleRomaji !== a.title && <p className="mt-2 text-base font-medium text-muted">{a.titleRomaji}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <ScorePill value={a.rating} className="bg-surface-2 text-sm" />
            <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-bold text-fg-2">{formatLine(a)}</span>
            {a.source && <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-bold text-fg-2">{SOURCE_LABEL[a.source] || a.source}</span>}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {a.genreIds.slice(0, 4).map((g) => (
              <GenreChip key={g} name={g} />
            ))}
          </div>
          <p className="mt-5 line-clamp-3 max-w-xl text-[15px] leading-relaxed text-fg-2">{a.overview}</p>
          <AiringPill item={a} />
          <div className="mt-6 flex flex-wrap gap-3">
            <LazyTrailerButton item={a} variant="primary" label="Watch trailer" />
            <HeroPlan item={a} />
            <Button as={Link} to={detailPath(a)} variant="surface" size="lg" icon="info">
              Details
            </Button>
          </div>
        </div>

        {/* Key art + vertical Japanese title. */}
        <div key={`art-${a.externalId}`} className="rise relative ml-auto hidden shrink-0 items-start gap-5 lg:flex">
          {a.titleNative && (
            <p aria-hidden className="tategaki max-h-[440px] overflow-hidden whitespace-nowrap font-display text-6xl leading-none text-transparent [-webkit-text-stroke:1.5px_color-mix(in_srgb,var(--fg)_45%,transparent)]">
              {a.titleNative}
            </p>
          )}
          <div className="relative">
            <div className="absolute -inset-6 rounded-[32px] opacity-60 blur-3xl" style={{ background: glow }} />
            <Img
              src={a.posterUrl}
              title={a.title}
              eager
              className="relative aspect-[2/3] w-64 rotate-2 rounded-[22px] shadow-2xl ring-2 ring-white/15 xl:w-72"
            />
          </div>
        </div>
      </div>

      <div className="shell absolute inset-x-0 bottom-5 flex gap-2">
        {slides.map((s, i) => (
          <button
            key={s.externalId}
            type="button"
            onClick={() => c.go(i)}
            aria-label={`Show ${s.title}`}
            aria-current={i === c.index}
            className={cn(
              'h-12 w-9 overflow-hidden rounded-lg ring-2 transition-all',
              i === c.index ? 'scale-110 ring-accent' : 'opacity-50 ring-transparent hover:opacity-100',
            )}
          >
            <img src={s.posterUrl} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </section>
  )
}

function AiringPill({ item }) {
  const airing = useAiring(item)
  if (!airing) return null
  return (
    <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent-soft px-3.5 py-1.5 text-sm font-bold text-accent ring-1 ring-accent-line">
      <span className="h-2 w-2 animate-pulse rounded-full bg-accent" /> Episode {airing.episode} airs in {airing.in}
    </p>
  )
}

function HeroPlan({ item }) {
  const a = useItemActions(item)
  const on = a.status === STATUS.WISHLIST
  return (
    <Button variant="surface" size="lg" icon={on ? 'check' : 'plus'} onClick={() => a.setStatus(STATUS.WISHLIST)}>
      {on ? 'Planned' : 'Plan to watch'}
    </Button>
  )
}

/* ------------------------------------------------------- seasonal chart */

function SeasonChart() {
  const [season, setSeason] = useState(() => currentSeason())
  const [expanded, setExpanded] = useState(false)
  const q = useWorldQuery(['anime-season', season.season, season.year], (signal) => anime.season(season, signal))
  const items = q.data || []
  const shown = expanded ? items : items.slice(0, 9)
  const isNow = (() => {
    const cur = currentSeason()
    return cur.season === season.season && cur.year === season.year
  })()

  return (
    <section className="rise">
      <SectionHeader
        kicker={isNow ? 'Airing now' : 'Seasonal chart'}
        title={`${SEASON_NAME[season.season]} ${season.year}`}
        action={
          <div className="flex items-center gap-1.5">
            <IconButton icon="chevronLeft" label="Previous season" variant="surface" size="sm" onClick={() => setSeason((s) => shiftSeason(s, -1))} />
            <Button size="sm" variant={isNow ? 'soft' : 'surface'} onClick={() => setSeason(currentSeason())}>
              This season
            </Button>
            <IconButton icon="chevronRight" label="Next season" variant="surface" size="sm" onClick={() => setSeason((s) => shiftSeason(s, 1))} />
          </div>
        }
      />
      {q.isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[228px] rounded-card" />
          ))}
        </div>
      ) : q.error ? (
        <ErrorState compact error={q.error} onRetry={q.refetch} />
      ) : !items.length ? (
        <EmptyState icon="calendar" title="Nothing announced yet" hint="Check back closer to the season." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((a) => (
              <ChartCard key={a.externalId} item={a} />
            ))}
          </div>
          {items.length > 9 && (
            <div className="mt-6 flex justify-center">
              <Button variant="surface" iconRight={expanded ? 'chevronUp' : 'chevronDown'} onClick={() => setExpanded((v) => !v)}>
                {expanded ? 'Show less' : `Show all ${items.length}`}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

// AniList-style chart card: cover, countdown, studio in the cover's colour,
// scrollable synopsis and tinted genres.
function ChartCard({ item: a }) {
  const airing = useAiring(a)
  const color = a.color || 'var(--accent)'
  return (
    <article className="group relative grid h-[228px] grid-cols-[132px_1fr] overflow-hidden rounded-card bg-surface ring-1 ring-line transition-all hover:-translate-y-1 hover:ring-accent-line">
      <div className="relative">
        <Img src={a.posterUrl} title={a.title} className="h-full w-full" imgClassName="transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2.5 pt-8">
          <p className="line-clamp-2 text-[13px] font-bold leading-snug text-white">{a.title}</p>
          {a.studios?.[0] && (
            <p className="mt-0.5 truncate text-[11px] font-bold" style={{ color }}>
              {a.studios[0]}
            </p>
          )}
        </div>
      </div>
      <div className="flex min-h-0 flex-col p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-muted">{airing ? `Ep ${airing.episode} airing in` : SOURCE_LABEL[a.source] || 'Season'}</p>
            <p className="font-display text-lg leading-tight text-fg">{airing ? airing.in : `${SEASON_NAME[a.season] || ''} ${a.year || ''}`}</p>
            <p className="text-[11px] text-muted">
              {[FORMAT_LABEL[a.format] || a.format, a.episodes ? `${a.episodes} episodes` : null].filter(Boolean).join(' · ')}
            </p>
          </div>
          <ScorePill value={a.rating} className="shrink-0 bg-surface-2" />
        </div>
        <p className="thin-scrollbar relative z-20 mt-2 min-h-0 flex-1 overflow-y-auto pr-1 text-xs leading-relaxed text-fg-2">{a.overview}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {a.genreIds.slice(0, 3).map((g) => (
            <span key={g} className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `color-mix(in srgb, ${color} 22%, transparent)`, color: `color-mix(in srgb, ${color} 70%, white)` }}>
              {g}
            </span>
          ))}
        </div>
      </div>
      <Link to={detailPath(a)} aria-label={a.title} className="absolute inset-0 z-10" />
      <QuickActions item={a} compact className="absolute left-2 top-2 z-20" />
    </article>
  )
}

/* -------------------------------------------------------------- schedule */

function Schedule() {
  const now = useNow(60_000)
  const [start] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  })
  const [day, setDay] = useState(0)
  const q = useWorldQuery(
    ['anime-schedule', start],
    (signal) => anime.schedule({ start: Math.floor(start / 1000), end: Math.floor(start / 1000) + 7 * 86400 }, signal),
    { staleTime: 30 * 60 * 1000 },
  )

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start + i * 86400000)
    return {
      i,
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en', { weekday: 'long' }),
      short: d.toLocaleDateString('en', { weekday: 'short' }),
      date: d.getDate(),
      from: d.getTime(),
      to: d.getTime() + 86400000,
    }
  })
  const entries = (q.data || []).filter((e) => e.airingAt >= days[day].from && e.airingAt < days[day].to)
  const count = (d) => (q.data || []).filter((e) => e.airingAt >= d.from && e.airingAt < d.to).length

  return (
    <section className="rise">
      <SectionHeader kicker="Broadcast schedule" title="Airing This Week" subtitle="Times shown in your time zone" />
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {days.map((d) => (
          <button
            key={d.i}
            type="button"
            onClick={() => setDay(d.i)}
            aria-pressed={day === d.i}
            className={cn(
              'flex min-w-[84px] shrink-0 flex-col items-center rounded-2xl px-3 py-2 transition-all',
              day === d.i ? 'bg-accent-grad text-white shadow-[0_10px_30px_-12px_var(--accent)]' : 'bg-surface text-fg-2 ring-1 ring-line hover:text-fg',
            )}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">{d.i < 2 ? d.label : d.short}</span>
            <span className="font-display text-2xl leading-tight">{d.date}</span>
            {q.data && <span className="text-[10px] font-semibold opacity-75">{count(d)} eps</span>}
          </button>
        ))}
      </div>
      <div className="mt-5">
        {q.isLoading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-card" />
            ))}
          </div>
        ) : q.error ? (
          <ErrorState compact error={q.error} onRetry={q.refetch} />
        ) : !entries.length ? (
          <p className="rounded-card bg-surface px-5 py-8 text-center text-sm text-muted ring-1 ring-line">No episodes scheduled.</p>
        ) : (
          <ol className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {entries.map((e) => {
              const secs = Math.round((e.airingAt - now) / 1000)
              const aired = secs <= 0
              return (
                <li key={e.id} className="group relative flex items-center gap-4 rounded-card bg-surface p-3 ring-1 ring-line transition-colors hover:ring-accent-line">
                  <span className={cn('w-[4.75rem] shrink-0 whitespace-nowrap text-center font-display text-base', aired ? 'text-muted' : 'text-fg')}>
                    {new Date(e.airingAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </span>
                  <Img src={e.item.posterUrl} title={e.item.title} className="h-16 w-11 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <Link to={detailPath(e.item)} className="block truncate text-[15px] font-bold text-fg after:absolute after:inset-0 hover:text-accent">
                      {e.item.title}
                    </Link>
                    <p className="text-xs text-muted">
                      Episode {e.episode}
                      {e.item.episodes ? ` of ${e.item.episodes}` : ''} · {e.item.studios?.[0] || FORMAT_LABEL[e.item.format]}
                    </p>
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold', aired ? 'bg-surface-2 text-muted' : 'bg-accent-soft text-accent')}>
                    {aired ? 'Aired' : `in ${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`}
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- top list */

function TopList({ query }) {
  const { data, isLoading, error, refetch } = query
  const items = (data || []).slice(0, 10)
  return (
    <section className="rise">
      <SectionHeader kicker="Hall of fame" title="Top Anime Of All Time" />
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-card" />
          ))}
        </div>
      ) : error ? (
        <ErrorState compact error={error} onRetry={refetch} />
      ) : (
        <ol className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {items.map((a, i) => (
            <li key={a.externalId} className="group relative flex items-center gap-4 rounded-card bg-surface p-3 pr-4 ring-1 ring-line transition-all hover:-translate-y-0.5 hover:ring-accent-line">
              <span
                className={cn(
                  'grid h-11 w-11 shrink-0 place-items-center rounded-2xl font-display text-lg',
                  i < 3 ? 'bg-accent-grad text-white shadow-[0_8px_20px_-8px_var(--accent)]' : 'bg-surface-2 text-fg-2',
                )}
              >
                #{i + 1}
              </span>
              <Img src={a.posterUrl} title={a.title} className="h-[72px] w-12 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <Link to={detailPath(a)} className="block truncate text-[15px] font-bold text-fg after:absolute after:inset-0 hover:text-accent">
                  {a.title}
                </Link>
                <p className="truncate text-xs text-muted">{[formatLine(a), a.year].filter(Boolean).join(' · ')}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {a.genreIds.slice(0, 3).map((g) => (
                    <span key={g} className="rounded-full bg-surface-2 px-2 py-px text-[10px] font-semibold text-fg-2">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-display text-xl text-fg">{a.rating != null ? `${Math.round(a.rating * 10)}%` : '—'}</p>
                {a.popularity && <p className="text-[11px] text-muted">{Intl.NumberFormat('en', { notation: 'compact' }).format(a.popularity)} fans</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/* ------------------------------------------------------------ genre grid */

function GenreGrid({ genre, onClose }) {
  const q = useWorldQuery(['anime-genre', genre], (signal) => anime.byGenres([genre], signal))
  return (
    <section className="page-in">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <p className="kicker text-accent">Genre</p>
          <h2 className="mt-1.5 font-display text-5xl text-fg">{genre}</h2>
        </div>
        <Button variant="surface" size="sm" icon="x" onClick={onClose}>
          Close
        </Button>
      </div>
      {q.isLoading ? (
        <GridSkeleton />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={q.refetch} />
      ) : (
        <div className={gridClass('poster')}>
          {(q.data || []).map((a) => (
            <AnimeCard key={a.externalId} item={a} size="fill" />
          ))}
        </div>
      )}
    </section>
  )
}
