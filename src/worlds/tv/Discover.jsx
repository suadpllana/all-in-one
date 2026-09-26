import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { TV_GENRES, tmdb } from '../../api/tmdb'
import { STATUS } from '../../config/categories'
import { useRecommended, useSection } from '../../hooks/useDiscover'
import { useItemActions } from '../../hooks/useItemActions'
import { cn } from '../../lib/cn'
import { genreLabels } from '../../lib/genres'
import { detailPath } from '../../lib/paths'
import { getProgress } from '../../lib/progress'
import PosterCard from '../../components/cards/PosterCard'
import WideCard from '../../components/cards/WideCard'
import { Button } from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Rail from '../../components/ui/Rail'
import { SectionHeader } from '../../components/ui/Section'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/States'
import { LazyTrailerButton } from '../shared/Detail'
import GenreBrowser from '../shared/GenreBrowser'
import { useLibraryItems } from '../shared/library'
import Shelf from '../shared/Shelf'
import { useCarousel } from '../shared/useCarousel'

// TV — "the network". A swipeable spotlight carousel, your shows with the
// next episode one tap away, tonight's new episodes, trending stills,
// binge-worthy finished series and genre channels.
export default function TvDiscover() {
  const [params, setParams] = useSearchParams()
  const genre = params.get('genre')
  const trending = useSection('tv', 'trending')
  const airing = useSection('tv', 'airingToday')
  const topRated = useSection('tv', 'topRated')
  const recommended = useRecommended('tv')

  if (genre) {
    const g = TV_GENRES.find((x) => String(x.id) === genre)
    return (
      <div className="shell pt-8">
        <GenreBrowser
          queryKey={['tv']}
          kicker="Channel"
          title={g ? g.name : 'All series'}
          genre={g ? g.id : null}
          sort={params.get('sort') || 'popular'}
          onSort={(s) => setParams({ genre, sort: s })}
          fetchPage={tmdb.tv.discover}
          renderItem={(s) => <PosterCard key={s.externalId} item={s} size="fill" />}
          onClose={() => setParams({})}
        />
      </div>
    )
  }

  const binge = { ...topRated, data: (topRated.data || []).filter((s) => s.showStatus === 'Ended' || s.showStatus === 'Canceled') }

  return (
    <div className="space-y-16 pb-4">
      <Spotlight query={trending} />
      <div className="shell space-y-16">
        <ContinueWatching />
        <Channels onPick={(id) => setParams({ genre: String(id) })} />
        <Shelf
          kicker="New episodes"
          title="Airing Today"
          query={airing}
          render={(s) => <PosterCard key={s.externalId} rail item={s} badge="New ep" meta={[s.network, s.seasons ? `S${s.seasons}` : null].filter(Boolean).join(' · ')} />}
        />
        <Shelf
          kicker="Everyone’s watching"
          title="Trending This Week"
          query={trending}
          shape="wide"
          render={(s) => (
            <WideCard
              key={s.externalId}
              rail
              item={s}
              kicker={s.network || undefined}
              sub={[s.year, s.seasons ? `${s.seasons} season${s.seasons > 1 ? 's' : ''}` : null, genreLabels(s, 2).join(', ')].filter(Boolean).join(' · ')}
            />
          )}
        />
        <Shelf
          kicker="Start to finish"
          title="Binge-Worthy"
          subtitle="Acclaimed series that have wrapped — no waiting for the next season"
          query={binge.data.length ? binge : topRated}
          render={(s) => (
            <PosterCard
              key={s.externalId}
              rail
              item={s}
              meta={[s.seasons ? `${s.seasons} seasons` : null, s.episodes ? `${s.episodes} eps` : null, s.rating ? `★ ${s.rating.toFixed(1)}` : null].filter(Boolean).join(' · ')}
            />
          )}
        />
        <Shelf
          kicker="Based on your shows"
          title="Recommended For You"
          query={recommended}
          hideWhenEmpty
          render={(s) => <PosterCard key={s.externalId} rail item={s} />}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ spotlight */

function Spotlight({ query }) {
  const { data, isLoading, error, refetch } = query
  const slides = (data || []).filter((s) => s.backdropUrl).slice(0, 7)
  const c = useCarousel(slides.length, { interval: 7000 })
  const track = useRef(null)
  const programmatic = useRef(0)

  // Scroll the active card to the centre (and keep native swipe working).
  useEffect(() => {
    const el = track.current
    const card = el?.children[c.index]
    if (!el || !card) return
    programmatic.current = Date.now()
    el.scrollTo({ left: card.offsetLeft - (el.clientWidth - card.clientWidth) / 2, behavior: 'smooth' })
  }, [c.index, c.epoch])

  function onScroll() {
    if (Date.now() - programmatic.current < 900) return
    const el = track.current
    const mid = el.scrollLeft + el.clientWidth / 2
    let best = 0
    let dist = Infinity
    Array.from(el.children).forEach((card, i) => {
      const d = Math.abs(card.offsetLeft + card.clientWidth / 2 - mid)
      if (d < dist) {
        dist = d
        best = i
      }
    })
    if (best !== c.index) c.go(best)
  }

  if (isLoading) {
    return (
      <div className="px-[6vw] pt-6">
        <Skeleton className="aspect-video w-full rounded-card md:aspect-[21/9]" />
      </div>
    )
  }
  if (error) return <div className="shell pt-8"><ErrorState error={error} onRetry={refetch} /></div>
  if (!slides.length) return null

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Spotlight"
      className="rise pt-6"
      onMouseEnter={() => c.setPaused(true)}
      onMouseLeave={() => c.setPaused(false)}
    >
      <div
        ref={track}
        onScroll={onScroll}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-[max(6vw,calc((100%-1240px)/2))]"
      >
        {slides.map((s, i) => (
          <SpotlightCard key={s.externalId} item={s} active={i === c.index} onFocus={() => c.go(i)} />
        ))}
      </div>
      <div className="mt-5 flex justify-center gap-1.5">
        {slides.map((s, i) => (
          <button
            key={s.externalId}
            type="button"
            onClick={() => c.go(i)}
            aria-label={`Show ${s.title}`}
            aria-current={i === c.index}
            className="group relative h-1 w-10 overflow-hidden rounded-full bg-fg/15"
          >
            {i === c.index && (
              <span
                key={`${c.index}-${c.epoch}`}
                className="absolute inset-0 origin-left rounded-full bg-accent-grad"
                style={{ animation: `progress-fill ${c.interval}ms linear both`, animationPlayState: c.paused ? 'paused' : 'running' }}
              />
            )}
          </button>
        ))}
      </div>
    </section>
  )
}

function SpotlightCard({ item: s, active, onFocus }) {
  return (
    <article
      onFocus={onFocus}
      className={cn(
        'relative aspect-[4/5] w-[88vw] max-w-[1240px] shrink-0 snap-center overflow-hidden rounded-card bg-surface ring-1 ring-line transition-all duration-700 sm:aspect-video md:aspect-[21/9]',
        active ? 'opacity-100' : 'scale-[.96] opacity-40',
      )}
    >
      <img src={s.backdropUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent md:bg-gradient-to-r md:from-black/85 md:via-black/35" />
      <div className="absolute inset-x-0 bottom-0 max-w-2xl p-6 md:p-10">
        <p className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-white/80">
          {s.network && <span className="rounded-md bg-white/15 px-2 py-1 text-white backdrop-blur">{s.network}</span>}
          {s.showStatus === 'Returning Series' && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-accent-2" /> New episodes
            </span>
          )}
        </p>
        <h2 className="mt-3 font-display text-4xl leading-[0.95] text-white md:text-6xl">{s.title}</h2>
        <p className="mt-3 text-sm font-medium text-white/75">
          {[s.year, s.seasons ? `${s.seasons} season${s.seasons > 1 ? 's' : ''}` : null, genreLabels(s, 2).join(' · '), s.rating ? `★ ${s.rating.toFixed(1)}` : null]
            .filter(Boolean)
            .join('  ·  ')}
        </p>
        <p className="mt-3 line-clamp-2 hidden max-w-xl text-[15px] leading-relaxed text-white/80 md:block">{s.overview}</p>
        {active && (
          <div className="mt-6 flex flex-wrap gap-2.5">
            <SpotlightStatus item={s} />
            <LazyTrailerButton item={s} variant="glass" size="md" label="Trailer" />
            <Button as={Link} to={detailPath(s)} variant="glass" size="md" icon="info">
              Details
            </Button>
          </div>
        )}
      </div>
    </article>
  )
}

function SpotlightStatus({ item }) {
  const a = useItemActions(item)
  if (a.status === STATUS.IN_PROGRESS) {
    return (
      <Button variant="light" size="md" icon="plus" onClick={() => a.bump(1)}>
        Watched next episode
      </Button>
    )
  }
  const saved = a.status === STATUS.WISHLIST
  return (
    <Button variant="light" size="md" icon={saved ? 'check' : 'plus'} onClick={() => a.setStatus(STATUS.WISHLIST)}>
      {saved ? 'On watchlist' : 'Watchlist'}
    </Button>
  )
}

/* ------------------------------------------------------ continue watching */

function ContinueWatching() {
  const { items } = useLibraryItems('tv', STATUS.IN_PROGRESS, '', 'progress')
  if (!items.length) return null
  return (
    <section className="rise">
      <SectionHeader kicker="Your shows" title="Continue Watching" to="/tv/progress" />
      <Rail label="Continue watching">
        {items.map((s) => (
          <ContinueShow key={s.externalId} item={s} />
        ))}
      </Rail>
    </section>
  )
}

function ContinueShow({ item }) {
  const a = useItemActions(item)
  const info = getProgress({ ...item, _progress: a.progress })
  return (
    <WideCard
      rail
      item={item}
      kicker={item.network || 'Up next'}
      sub={info ? `Next: ${info.next} · ${info.detail}` : undefined}
      progress={info}
      action={
        <button
          type="button"
          onClick={() => a.bump(1)}
          className="flex h-9 items-center gap-1.5 rounded-full bg-accent px-3.5 text-xs font-bold text-on-accent shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          <Icon name="check" className="h-4 w-4" strokeWidth={2.6} /> {info?.next}
        </button>
      }
    />
  )
}

/* --------------------------------------------------------------- genres */

function Channels({ onPick }) {
  return (
    <section className="rise">
      <SectionHeader kicker="Browse by genre" title="Channels" />
      <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
        {TV_GENRES.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onPick(g.id)}
            className="group flex h-12 shrink-0 items-center gap-3 rounded-ui bg-surface px-4 text-sm font-semibold text-fg-2 ring-1 ring-line transition-all hover:-translate-y-0.5 hover:text-fg hover:ring-accent-line"
          >
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-on-accent">
              <Icon name={g.icon} className="h-4 w-4" />
            </span>
            {g.name}
          </button>
        ))}
      </div>
    </section>
  )
}
