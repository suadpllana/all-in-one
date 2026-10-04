import { useState } from 'react'
import { tmdb } from '../../api/tmdb'
import { STATUS } from '../../config/categories'
import { useWorldQuery } from '../../hooks/useDiscover'
import { useItemActions } from '../../hooks/useItemActions'
import { cn } from '../../lib/cn'
import { formatMinutes } from '../../lib/duration'
import { daysUntil, formatDate, LANGUAGES } from '../../lib/format'
import WideCard from '../../components/cards/WideCard'
import ProgressControl from '../../components/library/ProgressControl'
import StatusControl, { FavoriteButton } from '../../components/library/StatusControl'
import { Button } from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Img from '../../components/ui/Img'
import { SectionHeader } from '../../components/ui/Section'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/States'
import {
  BackButton,
  DetailError,
  DetailSkeleton,
  ExpandableText,
  Facts,
  PeopleRail,
  RatingBox,
  ReviewBox,
  TrailerButton,
} from '../shared/Detail'
import Shelf from '../shared/Shelf'
import { useDetailPage } from '../shared/useDetailPage'

// Show page: a profile-style header, your place in the show, the next
// episode's air date, and a season-by-season episode tracker.
export default function TvDetail({ category }) {
  const { data: s, isLoading, error, refetch } = useDetailPage('tv')
  if (error) return <DetailError error={error} onRetry={refetch} fallback={category.route} />
  if (isLoading || !s) return <DetailSkeleton />
  return <ShowBody s={s} category={category} />
}

const STATUS_STYLE = {
  'Returning Series': ['Returning', 'bg-emerald-400'],
  'In Production': ['In production', 'bg-amber-400'],
  Ended: ['Ended', 'bg-white/40'],
  Canceled: ['Cancelled', 'bg-red-400'],
  Planned: ['Planned', 'bg-sky-400'],
}

function ShowBody({ s, category }) {
  const a = useItemActions(s)
  const firstYear = s.year
  const lastYear = s.lastAirDate ? Number(s.lastAirDate.slice(0, 4)) : null
  const years = s.inProduction ? `${firstYear}–` : lastYear && lastYear !== firstYear ? `${firstYear}–${lastYear}` : firstYear
  const [statusLabel, dot] = STATUS_STYLE[s.showStatus] || [s.showStatus, 'bg-white/40']

  return (
    <article className="page-in">
      <header className="under-top relative">
        <div className="relative h-[44vh] min-h-[320px] overflow-hidden md:h-[58vh]">
          {s.backdropUrl && <img src={s.backdropUrl} alt="" className="h-full w-full object-cover object-top" />}
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-black/40" />
          <div className="shell absolute inset-x-0 top-20 md:top-24">
            <BackButton fallback={category.route} />
          </div>
        </div>
        <div className="shell relative -mt-44 flex flex-col gap-6 md:-mt-52 md:flex-row md:items-end md:gap-10">
          <Img
            src={s.posterUrl}
            title={s.title}
            eager
            className="aspect-[2/3] w-36 shrink-0 rounded-card shadow-[0_30px_60px_-20px_rgba(0,0,0,.9)] ring-1 ring-white/10 md:w-56"
          />
          <div className="min-w-0 pb-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              {statusLabel && (
                <span className="flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-fg ring-1 ring-line">
                  <span className={cn('h-2 w-2 rounded-full', dot, s.showStatus === 'Returning Series' && 'animate-pulse')} />
                  {statusLabel}
                </span>
              )}
              {s.network && <span className="rounded-full bg-accent-soft px-2.5 py-1 text-accent">{s.network}</span>}
              {s.certification && <span className="rounded-md px-1.5 py-0.5 text-fg-2 ring-1 ring-line">{s.certification}</span>}
            </div>
            <h1 className="mt-3 font-display text-5xl leading-[0.95] text-fg md:text-7xl">{s.title}</h1>
            <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm font-medium text-fg-2">
              {years && <span>{years}</span>}
              {s.seasons && <span>· {s.seasons} season{s.seasons > 1 ? 's' : ''}</span>}
              {s.episodes && <span>· {s.episodes} episodes</span>}
              {s.runtime && <span>· {formatMinutes(s.runtime)} / ep</span>}
              {s.rating != null && (
                <span className="flex items-center gap-1 font-bold text-accent-2">
                  · <Icon name="starFill" className="h-4 w-4" /> {s.rating.toFixed(1)}
                </span>
              )}
            </p>
            {s.directors?.length > 0 && (
              <p className="mt-2 text-sm text-muted">
                Created by <span className="font-semibold text-fg">{s.directors.join(', ')}</span>
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <StatusControl item={s} />
              <FavoriteButton item={s} />
              <TrailerButton videoKey={s.trailerKey} variant="surface" size="md" label="Trailer" title={`${s.title} — trailer`} />
            </div>
          </div>
        </div>
      </header>

      <div className="shell mt-12 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-12">
          {s.nextEpisode && <NextAiring next={s.nextEpisode} />}
          {(a.status === STATUS.IN_PROGRESS || a.progress) && a.status !== STATUS.COMPLETED && <ProgressControl item={s} />}
          {s.overview && (
            <section>
              <SectionHeader title="About the show" />
              {s.tagline && <p className="mb-2 font-display text-xl text-accent">{s.tagline}</p>}
              <ExpandableText text={s.overview} className="max-w-3xl text-[17px] leading-relaxed text-fg-2" />
            </section>
          )}
          {s.seasonsList?.length > 0 && <SeasonBrowser show={s} />}
          {s.cast?.length > 0 && (
            <section>
              <SectionHeader title="Series Cast" />
              <PeopleRail
                round
                inset
                people={s.cast.map((c) => ({ ...c, role: [c.role, c.episodes ? `${c.episodes} eps` : null].filter(Boolean).join(' · ') }))}
              />
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <RatingBox item={s} label="Your rating" hint="Rate the whole show — you can change it any time." />
          {a.status === STATUS.COMPLETED && <ReviewBox item={s} />}
          <div className="rounded-card bg-surface p-5 ring-1 ring-line">
            <h3 className="kicker text-muted">Details</h3>
            <Facts
              className="mt-2"
              rows={[
                ['Status', statusLabel],
                ['Network', s.networks?.join(', ')],
                ['First aired', formatDate(s.releaseDate)],
                ['Last aired', formatDate(s.lastAirDate)],
                ['Seasons', s.seasons],
                ['Episodes', s.episodes],
                ['Episode length', formatMinutes(s.runtime)],
                ['Language', LANGUAGES[s.originalLanguage] || s.originalLanguage?.toUpperCase()],
                ['Genres', s.genres],
              ]}
            />
          </div>
        </aside>
      </div>

      {s.recommendations?.length > 0 && (
        <div className="shell mt-16">
          <Shelf
            title="If You Like This"
            shape="wide"
            query={{ data: s.recommendations }}
            render={(r) => <WideCard key={r.externalId} rail item={r} sub={[r.year, r.rating ? `★ ${r.rating.toFixed(1)}` : null].filter(Boolean).join(' · ')} />}
          />
        </div>
      )}
    </article>
  )
}

function NextAiring({ next }) {
  const d = daysUntil(next.airDate)
  return (
    <div className="flex items-center gap-4 rounded-card bg-accent-soft p-4 ring-1 ring-accent-line md:p-5">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent text-on-accent">
        <Icon name="calendar" className="h-6 w-6" />
      </span>
      <div className="min-w-0">
        <p className="kicker text-[10px] text-accent">Next episode</p>
        <p className="truncate text-[15px] font-semibold text-fg">
          S{next.season} · E{next.episode}
          {next.name ? ` — “${next.name}”` : ''}
        </p>
        <p className="text-sm text-muted">
          {formatDate(next.airDate)}
          {d != null && d >= 0 ? ` · ${d === 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`}` : ''}
        </p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- episodes */

function SeasonBrowser({ show }) {
  const a = useItemActions(show)
  const p = a.progress
  const seasons = show.seasonsList
  const [sel, setSel] = useState(() => Math.min(p?.season || 1, seasons.at(-1)?.number || 1))
  const q = useWorldQuery(['tv-season', show.externalId, sel], (signal) => tmdb.tv.season(show.externalId, sel, signal))

  const isWatched = (sn, ep) => Boolean(p?.season) && (sn < p.season || (sn === p.season && ep <= (p.episode || 0)))
  const seasonDone = (sn, count) => isWatched(sn, count)
  const today = new Date().toISOString().slice(0, 10)

  function toggle(sn, ep) {
    if (p?.season === sn && p?.episode === ep) a.bump(-1)
    else a.setProgress({ season: sn, episode: ep })
  }

  const episodes = q.data?.episodes || []
  const aired = episodes.filter((e) => !e.airDate || e.airDate <= today)

  return (
    <section>
      <SectionHeader
        title="Episodes"
        action={
          aired.length > 0 && !seasonDone(sel, aired.at(-1).number) ? (
            <Button size="sm" icon="check" onClick={() => a.setProgress({ season: sel, episode: aired.at(-1).number })}>
              Mark season watched
            </Button>
          ) : null
        }
      />
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
        {seasons.map((sn) => {
          const done = seasonDone(sn.number, sn.episodeCount)
          return (
            <button
              key={sn.number}
              type="button"
              onClick={() => setSel(sn.number)}
              aria-pressed={sel === sn.number}
              className={cn(
                'flex h-10 shrink-0 items-center gap-2 rounded-ui px-4 text-sm font-semibold transition-colors',
                sel === sn.number ? 'bg-accent text-on-accent' : 'bg-surface text-fg-2 ring-1 ring-line hover:text-fg',
              )}
            >
              {done && <Icon name="checkCircle" className="h-4 w-4" />}
              Season {sn.number}
              <span className="opacity-60">{sn.episodeCount}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-4">
        {q.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-card" />
            ))}
          </div>
        ) : q.error ? (
          <ErrorState compact error={q.error} onRetry={q.refetch} />
        ) : (
          <ol className="divide-y divide-line/70 overflow-hidden rounded-card bg-surface ring-1 ring-line">
            {episodes.map((e) => {
              const watched = isWatched(sel, e.number)
              const future = e.airDate && e.airDate > today
              const isNext = !watched && !future && ((p?.season === sel && (p?.episode || 0) + 1 === e.number) || (!p?.season && sel === 1 && e.number === 1))
              return (
                <li
                  key={e.number}
                  className={cn(
                    'grid grid-cols-[1fr_auto] items-center gap-4 p-3 transition-colors sm:grid-cols-[168px_1fr_auto] sm:p-4',
                    isNext && 'bg-accent-soft',
                    future && 'opacity-55',
                  )}
                >
                  <div className="relative hidden overflow-hidden rounded-[10px] sm:block">
                    <Img src={e.stillUrl} alt="" className="aspect-video w-full" fallback={<div className="grid h-full place-items-center text-muted"><Icon name="tv" className="h-6 w-6" /></div>} />
                    {watched && <span className="absolute inset-0 grid place-items-center bg-black/45"><Icon name="check" className="h-7 w-7 text-white" strokeWidth={2.6} /></span>}
                  </div>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-2 text-xs font-semibold text-muted">
                      <span className={cn(isNext && 'text-accent')}>E{e.number}{isNext ? ' · Up next' : ''}</span>
                      {e.airDate && <span>· {formatDate(e.airDate)}</span>}
                      {e.runtime && <span>· {e.runtime}m</span>}
                    </p>
                    <h4 className={cn('mt-0.5 truncate font-semibold', watched ? 'text-fg-2' : 'text-fg')}>{e.name}</h4>
                    {e.overview && <p className="mt-1 line-clamp-2 text-sm text-muted">{e.overview}</p>}
                  </div>
                  <button
                    type="button"
                    disabled={future}
                    onClick={() => toggle(sel, e.number)}
                    aria-pressed={watched}
                    aria-label={watched ? `Unmark S${sel} E${e.number}` : `Mark watched up to S${sel} E${e.number}`}
                    title={future ? `Airs ${formatDate(e.airDate)}` : watched ? 'Watched' : 'Mark watched (and everything before it)'}
                    className={cn(
                      'grid h-10 w-10 shrink-0 place-items-center rounded-full ring-1 transition-all active:scale-90 disabled:cursor-not-allowed',
                      watched ? 'bg-accent text-on-accent ring-accent' : 'text-muted ring-line hover:text-accent hover:ring-accent',
                    )}
                  >
                    <Icon name={future ? 'clock' : 'check'} className="h-5 w-5" strokeWidth={2.4} />
                  </button>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}
