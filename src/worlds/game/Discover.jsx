import { Link, useSearchParams } from 'react-router-dom'
import { GAME_GENRES, rawg, rawgThumb } from '../../api/rawg'
import { STATUS } from '../../config/categories'
import { useRecommended, useSection } from '../../hooks/useDiscover'
import { useHdImage } from '../../hooks/useHdImage'
import { useItemActions } from '../../hooks/useItemActions'
import { cn } from '../../lib/cn'
import { daysUntil, monthDay, scoreTone } from '../../lib/format'
import { genreLabels } from '../../lib/genres'
import { detailPath } from '../../lib/paths'
import { PLATFORM_FILTERS } from '../../lib/platforms'
import GameCard from '../../components/cards/GameCard'
import Platforms from '../../components/cards/Platforms'
import QuickActions from '../../components/library/QuickActions'
import { Button } from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Img from '../../components/ui/Img'
import { SectionHeader } from '../../components/ui/Section'
import { HeroSkeleton, Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/States'
import GenreBrowser from '../shared/GenreBrowser'
import Shelf from '../shared/Shelf'
import { useCarousel } from '../shared/useCarousel'

// Games — "the HUD". A featured-game hero framed like a HUD, a platform
// switcher that re-scopes every shelf, wide capsules that scrub through
// screenshots on hover, an upcoming-release list and genre tiles.
export default function GameDiscover() {
  const [params, setParams] = useSearchParams()
  const platformKey = params.get('platform') || 'all'
  const platform = PLATFORM_FILTERS.find((p) => p.key === platformKey)?.ids || null
  const genre = params.get('genre')
  const opts = { args: [{ platform }] }
  const trending = useSection('game', 'trending', opts)
  const topRated = useSection('game', 'topRated', opts)
  const fresh = useSection('game', 'newReleases', opts)
  const upcoming = useSection('game', 'upcoming', opts)
  const recommended = useRecommended('game')

  const setParam = (k, v) =>
    setParams((prev) => {
      const p = new URLSearchParams(prev)
      if (v) p.set(k, v)
      else p.delete(k)
      return p
    })

  return (
    <div className="pb-4">
      {!genre && <GameHero query={trending} />}
      <div className={cn('shell relative z-10 space-y-14', genre ? 'pt-8' : '-mt-6')}>
        <PlatformTabs value={platformKey} onChange={(k) => setParam('platform', k === 'all' ? null : k)} />
        {genre ? (
          <GenreBrowser
            queryKey={['game', platform]}
            kicker="Genre"
            title={GAME_GENRES.find((g) => g.slug === genre)?.name || genre}
            genre={genre}
            sort="popular"
            sorts={[{ key: 'popular', label: 'Popular' }]}
            onSort={() => {}}
            shape="wide"
            fetchPage={({ genre: g, page }, signal) => rawg.byGenre(g, signal, { platform, page })}
            renderItem={(g) => <GameCard key={g.externalId} item={g} size="fill" />}
            onClose={() => setParam('genre', null)}
          />
        ) : (
          <>
            <Shelf kicker="Most added lately" title="Trending Now" query={trending} shape="wide" render={(g) => <GameCard key={g.externalId} rail item={g} />} />
            <Shelf kicker="Metacritic 85+" title="Highest Rated" query={topRated} shape="wide" render={(g) => <GameCard key={g.externalId} rail item={g} />} />
            <Upcoming query={upcoming} />
            <GenreTiles onPick={(slug) => setParam('genre', slug)} />
            <Shelf kicker="Just dropped" title="New Releases" query={fresh} shape="wide" render={(g) => <GameCard key={g.externalId} rail item={g} />} />
            <Shelf
              kicker="Based on your library"
              title="Recommended For You"
              query={recommended}
              shape="wide"
              hideWhenEmpty
              render={(g) => <GameCard key={g.externalId} rail item={g} />}
            />
          </>
        )}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- hero */

function GameHero({ query }) {
  const { data, isLoading, error, refetch } = query
  const slides = (data || []).slice(0, 6)
  const c = useCarousel(slides.length, { interval: 8000 })
  const g = slides[c.index]
  const hd = useHdImage(g ? [g.backdropUrl, ...(g.backdropAlts || [])] : [])

  if (isLoading) return <HeroSkeleton className="under-bars h-[80vh]" />
  if (error) return <div className="shell pt-10"><ErrorState error={error} onRetry={refetch} /></div>
  if (!g) return null

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Trending games"
      onMouseEnter={() => c.setPaused(true)}
      onMouseLeave={() => c.setPaused(false)}
      className="under-bars relative min-h-[640px] overflow-hidden [clip-path:polygon(0_0,100%_0,100%_calc(100%-48px),calc(100%-48px)_100%,0_100%)] md:h-[84vh] md:max-h-[880px]"
    >
      {hd && <img key={hd} src={hd} alt="" className="fade-in absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/75 to-bg/5" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-bg via-bg/60 to-transparent" />
      {/* HUD scanlines */}
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,.025)_0_1px,transparent_1px_3px)]" />

      <div className="shell relative flex h-full min-h-[640px] items-end pb-20 pt-36 md:items-center md:pb-16">
        <div key={g.externalId} className="hud-brackets rise relative max-w-2xl p-6 md:p-8">
          <p className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.25em] text-accent">
            <span className="h-2 w-2 animate-pulse bg-accent" /> Now trending · {String(c.index + 1).padStart(2, '0')}/{String(slides.length).padStart(2, '0')}
          </p>
          <h1 className="display mt-4 text-[2.7rem] leading-[0.95] text-fg md:text-6xl xl:text-7xl">{g.title}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {g.metacritic != null && (
              <span className={cn('chamfer-sm px-2.5 py-1.5 font-display text-xl leading-none', scoreTone(g.metacritic))} title="Metacritic">
                {g.metacritic}
              </span>
            )}
            <Platforms platforms={g.platforms} max={6} size="md" />
            <span className="text-sm text-fg-2">{genreLabels(g, 3).join(' · ')}</span>
          </div>
          <dl className="mt-5 grid max-w-md grid-cols-3 gap-3">
            <Stat label="Release" value={g.year || 'TBA'} />
            <Stat label="To beat" value={g.playtime ? `~${g.playtime}h` : '—'} />
            <Stat label="Players" value={g.userRating ? `${g.userRating.toFixed(1)}/5` : '—'} />
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <HeroBacklog item={g} />
            <Button as={Link} to={detailPath(g)} variant="surface" size="lg" icon="info" className="chamfer-sm rounded-none">
              Details
            </Button>
          </div>
        </div>

        {/* Slide selector */}
        <div className="absolute bottom-20 right-4 hidden flex-col gap-2 md:right-8 lg:flex xl:right-12">
          {slides.map((s, i) => (
            <button
              key={s.externalId}
              type="button"
              onClick={() => c.go(i)}
              aria-label={`Show ${s.title}`}
              aria-current={i === c.index}
              className={cn(
                'chamfer-sm group relative flex w-64 items-center gap-3 bg-surface/70 p-1.5 pr-3 text-left backdrop-blur transition-all',
                i === c.index ? 'bg-surface ring-1 ring-accent' : 'opacity-60 hover:opacity-100',
              )}
            >
              <img src={rawgThumb(s.backdropUrl, 420)} alt="" className="aspect-video w-20 object-cover" onError={(e) => (e.currentTarget.src = s.backdropUrl)} />
              <span className="min-w-0 truncate font-display text-sm text-fg">{s.title}</span>
              {i === c.index && (
                <span
                  key={`${c.index}-${c.epoch}`}
                  className="absolute bottom-0 left-0 h-[2px] w-full origin-left bg-accent"
                  style={{ animation: `progress-fill ${c.interval}ms linear both`, animationPlayState: c.paused ? 'paused' : 'running' }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

function Stat({ label, value }) {
  return (
    <div className="chamfer-sm bg-surface/80 px-3 py-2 ring-1 ring-line backdrop-blur">
      <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</dt>
      <dd className="mt-0.5 font-display text-lg text-fg">{value}</dd>
    </div>
  )
}

function HeroBacklog({ item }) {
  const a = useItemActions(item)
  if (a.status === STATUS.IN_PROGRESS) {
    return (
      <Button variant="primary" size="lg" icon="plus" onClick={() => a.bump(1)} className="chamfer-sm rounded-none">
        Log an hour
      </Button>
    )
  }
  const on = a.status === STATUS.WISHLIST
  return (
    <Button variant="primary" size="lg" icon={on ? 'check' : 'plus'} onClick={() => a.setStatus(STATUS.WISHLIST)} className="chamfer-sm rounded-none">
      {on ? 'In backlog' : 'Add to backlog'}
    </Button>
  )
}

/* ------------------------------------------------------------ platforms */

function PlatformTabs({ value, onChange }) {
  return (
    <nav aria-label="Platform" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
      {PLATFORM_FILTERS.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => onChange(p.key)}
          aria-pressed={value === p.key}
          className={cn(
            'chamfer-sm flex h-10 shrink-0 items-center gap-2 px-4 font-display text-sm uppercase tracking-wider transition-colors',
            value === p.key ? 'bg-accent text-on-accent' : 'bg-surface text-fg-2 ring-1 ring-line hover:text-fg',
          )}
        >
          <Icon name={p.key === 'mobile' ? 'smartphone' : p.key === 'pc' ? 'monitor' : p.key === 'all' ? 'grid' : 'gamepad'} className="h-4 w-4" />
          {p.label}
        </button>
      ))}
    </nav>
  )
}

/* -------------------------------------------------------------- upcoming */

function Upcoming({ query }) {
  const { data, isLoading, error, refetch } = query
  const items = (data || []).slice(0, 6)
  return (
    <section className="rise">
      <SectionHeader kicker="Mark your calendar" title="Coming Soon" />
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : error ? (
        <ErrorState compact error={error} onRetry={refetch} />
      ) : !items.length ? (
        <p className="text-sm text-muted">No announced releases.</p>
      ) : (
        <ol className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {items.map((g) => {
            const md = monthDay(g.releaseDate)
            const d = daysUntil(g.releaseDate)
            return (
              <li key={g.externalId} className="chamfer group relative flex items-stretch gap-4 bg-surface p-3 ring-1 ring-line transition-colors hover:bg-surface-2">
                <div className="flex w-16 shrink-0 flex-col items-center justify-center border-r border-line pr-3 text-center">
                  <span className="font-mono text-[11px] font-bold tracking-widest text-accent">{md?.month}</span>
                  <span className="font-display text-3xl leading-none text-fg">{md?.day}</span>
                </div>
                <Img src={rawgThumb(g.backdropUrl, 420)} fallbackSrc={g.backdropUrl} title={g.title} className="chamfer-sm aspect-video w-32 shrink-0 sm:w-40" />
                <div className="min-w-0 flex-1 self-center">
                  <Link to={detailPath(g)} className="block truncate font-display text-lg text-fg after:absolute after:inset-0 hover:text-accent">
                    {g.title}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-muted">{genreLabels(g, 2).join(' · ')}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Platforms platforms={g.platforms} />
                    {d != null && d >= 0 && <span className="font-mono text-[11px] font-bold text-accent-2">T-{d}d</span>}
                  </div>
                </div>
                <QuickActions item={g} compact className="relative z-10 self-center" />
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

/* ---------------------------------------------------------------- genres */

function GenreTiles({ onPick }) {
  return (
    <section className="rise">
      <SectionHeader kicker="Browse" title="Genres" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {GAME_GENRES.map((g) => (
          <button
            key={g.slug}
            type="button"
            onClick={() => onPick(g.slug)}
            className="chamfer group relative flex h-24 flex-col justify-between bg-surface p-4 text-left ring-1 ring-line transition-all hover:bg-surface-2"
          >
            <Icon name={g.icon} className="h-6 w-6 text-accent transition-transform duration-300 group-hover:scale-125" />
            <span className="font-display text-lg uppercase tracking-wider text-fg">{g.name}</span>
            <span className="absolute right-3 top-3 font-mono text-[10px] text-muted opacity-0 transition-opacity group-hover:opacity-100">
              ENTER ›
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
