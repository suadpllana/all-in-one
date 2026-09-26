import { Link, useSearchParams } from 'react-router-dom'
import { MOVIE_GENRES, tmdb } from '../../api/tmdb'
import { STATUS } from '../../config/categories'
import { useRecommended, useSection } from '../../hooks/useDiscover'
import { useItemActions } from '../../hooks/useItemActions'
import { cn } from '../../lib/cn'
import { daysUntil, formatDate } from '../../lib/format'
import { formatMinutes } from '../../lib/duration'
import { genreLabels } from '../../lib/genres'
import { detailPath } from '../../lib/paths'
import PosterCard from '../../components/cards/PosterCard'
import WideCard from '../../components/cards/WideCard'
import QuickActions from '../../components/library/QuickActions'
import { Button } from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Img from '../../components/ui/Img'
import { SectionHeader } from '../../components/ui/Section'
import { HeroSkeleton, Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/States'
import { LazyTrailerButton } from '../shared/Detail'
import GenreBrowser from '../shared/GenreBrowser'
import Shelf from '../shared/Shelf'
import { useCarousel } from '../shared/useCarousel'

// Movies — "the cinema". Marquee hero with trailers, a Top 10 with giant
// rank numerals, what's in theaters, a release calendar, genre tiles and an
// all-time greats list.
export default function MovieDiscover() {
  const [params, setParams] = useSearchParams()
  const genre = params.get('genre')
  const trending = useSection('movie', 'trending')
  const nowPlaying = useSection('movie', 'newReleases')
  const upcoming = useSection('movie', 'upcoming')
  const topRated = useSection('movie', 'topRated')
  const recommended = useRecommended('movie')

  if (genre) {
    const g = MOVIE_GENRES.find((x) => String(x.id) === genre)
    const sort = params.get('sort') || (genre === 'all' ? 'top' : 'popular')
    return (
      <div className="shell pt-8">
        <GenreBrowser
          queryKey={['movie']}
          kicker="Browse films"
          title={g ? g.name : 'All films'}
          genre={g ? g.id : null}
          sort={sort}
          onSort={(s) => setParams({ genre, sort: s })}
          fetchPage={tmdb.movie.discover}
          renderItem={(m) => <PosterCard key={m.externalId} item={m} size="fill" />}
          onClose={() => setParams({})}
        />
      </div>
    )
  }

  return (
    <div>
      <MovieHero query={trending} />
      <div className="shell relative z-10 -mt-10 space-y-16 md:-mt-20">
        <Top10 query={trending} />
        <Shelf
          kicker="In theaters"
          title="Now Showing"
          query={nowPlaying}
          render={(m) => <PosterCard key={m.externalId} rail item={m} />}
        />
        <ComingSoon query={upcoming} />
        <GenreTiles onPick={(id) => setParams({ genre: String(id) })} />
        <Shelf
          kicker="Picked from your diary"
          title="Recommended For You"
          query={recommended}
          hideWhenEmpty
          render={(m) => <PosterCard key={m.externalId} rail item={m} />}
        />
        <TheGreats query={topRated} onMore={() => setParams({ genre: 'all', sort: 'top' })} />
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- hero */

function MovieHero({ query }) {
  const { data, isLoading, error, refetch } = query
  const slides = (data || []).filter((m) => m.backdropUrl).slice(0, 6)
  const c = useCarousel(slides.length, { interval: 9000 })

  if (isLoading) return <HeroSkeleton className="under-bars h-[92vh] max-h-[900px]" />
  if (error) return <div className="shell pt-10"><ErrorState error={error} onRetry={refetch} /></div>
  if (!slides.length) return null
  const m = slides[c.index]

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Trending films"
      onMouseEnter={() => c.setPaused(true)}
      onMouseLeave={() => c.setPaused(false)}
      className="grain under-bars relative h-[88vh] max-h-[920px] min-h-[600px] overflow-hidden bg-black"
    >
      {slides.map((s, i) => (
        <div
          key={s.externalId}
          aria-hidden={i !== c.index}
          className={cn('absolute inset-0 transition-opacity duration-[1200ms]', i === c.index ? 'opacity-100' : 'opacity-0')}
        >
          <img
            key={i === c.index ? `${s.externalId}-${c.epoch}-${c.index}` : s.externalId}
            src={s.backdropUrl}
            alt=""
            className={cn('h-full w-full object-cover object-[center_25%]', i === c.index && 'kenburns')}
          />
        </div>
      ))}
      {/* Vignette + fades into the auditorium black. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,transparent_30%,rgba(0,0,0,.55))]" />
      <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/55 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-bg via-bg/70 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black/70 to-transparent" />

      <div className="shell relative flex h-full flex-col justify-end pb-28 md:pb-36">
        <div key={m.externalId} className="rise max-w-3xl">
          <p className="kicker flex items-center gap-2 text-accent-2">
            <Icon name="trending" className="h-4 w-4" />#{c.index + 1} in films this week
          </p>
          <h1 className="display mt-3 text-[3.6rem] text-white drop-shadow-2xl sm:text-7xl md:text-8xl xl:text-[8.5rem]">
            {m.title}
          </h1>
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-white/80 md:text-base">
            {m.rating != null && (
              <span className="flex items-center gap-1.5 font-bold text-accent-2">
                <Icon name="starFill" className="h-4 w-4" />
                {m.rating.toFixed(1)}
              </span>
            )}
            {m.year && <span>{m.year}</span>}
            {m.runtime && <span>{formatMinutes(m.runtime)}</span>}
            {genreLabels(m, 3).map((g) => (
              <span key={g} className="rounded-sm border border-white/30 px-1.5 py-px text-xs uppercase tracking-wider text-white/75">
                {g}
              </span>
            ))}
          </p>
          <p className="mt-4 line-clamp-3 max-w-2xl text-[15px] leading-relaxed text-white/80 md:text-lg">{m.overview}</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <LazyTrailerButton item={m} />
            <HeroWatchlist item={m} />
            <Button as={Link} to={detailPath(m)} variant="glass" size="lg" icon="info">
              Details
            </Button>
          </div>
        </div>

        {/* Up-next reel (wide screens): the rotation, with the running slide's timer. */}
        <ol className="absolute bottom-24 right-4 hidden w-72 flex-col gap-1.5 md:right-8 xl:right-12 xl:flex">
          <li className="kicker mb-1 text-white/60">Up next</li>
          {slides.map((s, i) => (
            <li key={s.externalId}>
              <button
                type="button"
                onClick={() => c.go(i)}
                aria-label={`Show ${s.title}`}
                aria-current={i === c.index}
                className={cn(
                  'group relative flex w-full items-center gap-3 overflow-hidden rounded-md p-1.5 text-left transition-colors',
                  i === c.index ? 'bg-white/12' : 'opacity-70 hover:bg-white/8 hover:opacity-100',
                )}
              >
                <img src={s.backdropUrl} alt="" className="aspect-video w-20 shrink-0 rounded-[4px] object-cover" />
                <span className="min-w-0">
                  <span className="block truncate font-display text-lg leading-tight tracking-wide text-white">{s.title}</span>
                  <span className="text-xs text-white/60">{[s.year, formatMinutes(s.runtime)].filter(Boolean).join(' · ')}</span>
                </span>
                {i === c.index && (
                  <span
                    key={`${c.index}-${c.epoch}`}
                    className="absolute bottom-0 left-0 h-[2px] w-full origin-left bg-accent-2"
                    style={{ animation: `progress-fill ${c.interval}ms linear both`, animationPlayState: c.paused ? 'paused' : 'running' }}
                  />
                )}
              </button>
            </li>
          ))}
        </ol>
        <div className="absolute bottom-16 left-1/2 flex -translate-x-1/2 gap-1.5 xl:hidden">
          {slides.map((s, i) => (
            <button
              key={s.externalId}
              type="button"
              onClick={() => c.go(i)}
              aria-label={`Show ${s.title}`}
              className={cn('h-1.5 rounded-full transition-all', i === c.index ? 'w-6 bg-accent-2' : 'w-1.5 bg-white/40')}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function HeroWatchlist({ item }) {
  const a = useItemActions(item)
  const saved = a.status === STATUS.WISHLIST
  const watched = a.status === STATUS.COMPLETED
  return (
    <Button
      variant="glass"
      size="lg"
      icon={watched ? 'eye' : saved ? 'check' : 'plus'}
      onClick={() => a.setStatus(watched ? STATUS.COMPLETED : STATUS.WISHLIST)}
    >
      {watched ? 'Watched' : saved ? 'On watchlist' : 'Watchlist'}
    </Button>
  )
}

/* -------------------------------------------------------------- top 10 */

function Top10({ query }) {
  const { data, isLoading } = query
  if (isLoading) {
    return (
      <div className="flex gap-6 overflow-hidden pt-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[2/3] w-[170px] shrink-0 rounded-card" />
        ))}
      </div>
    )
  }
  const items = (data || []).slice(0, 10)
  if (!items.length) return null
  return (
    <section className="rise">
      <SectionHeader kicker="This week" title="Top 10 Films" />
      <div
        role="list"
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-1 overflow-x-auto px-4 pb-5 pt-2 md:-mx-8 md:scroll-px-8 md:px-8 xl:-mx-12 xl:scroll-px-12 xl:px-12"
      >
        {items.map((m, i) => (
          <div key={m.externalId} role="listitem" className="flex shrink-0 snap-start items-end">
            <span
              aria-hidden
              className={cn(
                'outline-num relative z-0 -mr-4 select-none text-[9.5rem] tracking-[-0.08em] md:-mr-6 md:text-[13rem]',
                i === 0 && '[-webkit-text-stroke-color:var(--accent-2)]',
              )}
            >
              {i + 1}
            </span>
            <div className="relative z-10 w-[108px] sm:w-[124px] md:w-[138px]">
              <PosterCard item={m} size="fill" showMeta={false} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* --------------------------------------------------------- coming soon */

function ComingSoon({ query }) {
  const items = (query.data || []).filter((m) => m.backdropUrl)
  return (
    <Shelf
      kicker="Release calendar"
      title="Coming Soon"
      query={{ ...query, data: items }}
      shape="wide"
      render={(m) => {
        const d = daysUntil(m.releaseDate)
        return (
          <WideCard
            key={m.externalId}
            rail
            item={m}
            date={m.releaseDate}
            sub={d != null && d >= 0 ? (d === 0 ? 'Out today' : `In ${d} day${d === 1 ? '' : 's'} · ${formatDate(m.releaseDate)}`) : formatDate(m.releaseDate)}
          />
        )
      }}
    />
  )
}

/* ------------------------------------------------------------- genres */

const GENRE_STYLE = {
  28: ['#ff512f', '#b31217'],
  12: ['#f7971e', '#c0392b'],
  16: ['#43cea2', '#185a9d'],
  35: ['#f9d423', '#f83600'],
  80: ['#3a3a3a', '#8e0e00'],
  18: ['#7f00ff', '#3a0ca3'],
  14: ['#654ea3', '#da98b4'],
  27: ['#1a0000', '#7a0000'],
  9648: ['#0f2027', '#2c5364'],
  10749: ['#ee9ca7', '#c9184a'],
  878: ['#00c6ff', '#0040a8'],
  53: ['#232526', '#a4161a'],
}

function GenreTiles({ onPick }) {
  return (
    <section className="rise">
      <SectionHeader kicker="Browse" title="Pick A Genre" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {MOVIE_GENRES.map((g) => {
          const [a, b] = GENRE_STYLE[g.id] || ['#333', '#111']
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onPick(g.id)}
              className="group relative h-24 overflow-hidden rounded-card text-left shadow-lg ring-1 ring-white/10 transition-transform duration-300 hover:-translate-y-1 md:h-28"
              style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
            >
              <Icon
                name={g.icon}
                className="absolute -bottom-3 -right-2 h-20 w-20 text-white/15 transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110"
                strokeWidth={1.5}
              />
              <span className="absolute bottom-3 left-4 font-display text-3xl leading-none tracking-wide text-white drop-shadow md:text-4xl">
                {g.name}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

/* ---------------------------------------------------------- the greats */

function TheGreats({ query, onMore }) {
  const { data, isLoading, error, refetch } = query
  const items = (data || []).slice(0, 10)
  return (
    <section className="rise">
      <SectionHeader
        kicker="All-time"
        title="The Greats"
        subtitle="The highest-rated films of all time"
        action={
          <Button variant="ghost" size="sm" iconRight="chevronRight" onClick={onMore}>
            Full list
          </Button>
        }
      />
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-card" />
          ))}
        </div>
      ) : error ? (
        <ErrorState compact error={error} onRetry={refetch} />
      ) : (
        <ol className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
          {items.map((m, i) => (
            <li key={m.externalId} className="group relative flex items-center gap-4 border-b border-line py-3.5">
              <span className={cn('w-12 shrink-0 text-center font-display text-5xl leading-none', i < 3 ? 'text-accent-2' : 'text-muted/60')}>
                {i + 1}
              </span>
              <Img src={m.posterUrl} title={m.title} className="aspect-[2/3] w-12 shrink-0 rounded-[4px] ring-1 ring-line" />
              <div className="min-w-0 flex-1">
                <Link to={detailPath(m)} className="block truncate text-[15px] font-semibold text-fg after:absolute after:inset-0 hover:text-accent">
                  {m.title}
                </Link>
                <p className="mt-0.5 text-sm text-muted">
                  {[m.year, formatMinutes(m.runtime), genreLabels(m, 2).join(', ')].filter(Boolean).join(' · ')}
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-accent-2">
                <Icon name="starFill" className="h-4 w-4" />
                {m.rating?.toFixed(1)}
              </span>
              <QuickActions item={m} compact row className="relative z-10" />
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
