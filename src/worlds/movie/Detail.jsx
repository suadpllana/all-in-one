import { STATUS } from '../../config/categories'
import { useItemActions } from '../../hooks/useItemActions'
import { formatMinutes } from '../../lib/duration'
import { compact, formatDate, LANGUAGES, money } from '../../lib/format'
import PosterCard from '../../components/cards/PosterCard'
import StatusControl, { FavoriteButton } from '../../components/library/StatusControl'
import Icon from '../../components/ui/Icon'
import Img from '../../components/ui/Img'
import { ProgressRing } from '../../components/ui/Progress'
import { SectionHeader } from '../../components/ui/Section'
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

// Film page: a full-bleed still, marquee title, the director's credit, a
// trailer, and the diary controls (watched / watchlist / like / rate /
// review), then cast & crew and the film's facts.
export default function MovieDetail({ category }) {
  const { data: m, isLoading, error, refetch } = useDetailPage('movie')
  if (error) return <DetailError error={error} onRetry={refetch} fallback={category.route} />
  if (isLoading || !m) return <DetailSkeleton />
  return <MovieBody m={m} category={category} />
}

function MovieBody({ m, category }) {
  const a = useItemActions(m)
  const watched = a.status === STATUS.COMPLETED
  const crew = [
    ['Director', m.directors],
    ['Writers', m.writers],
    ['Music', m.composer],
    ['Cinematography', m.cinematographer],
    ['Editor', m.editor],
  ].filter(([, v]) => v?.length)

  return (
    <article className="page-in">
      <header className="grain under-top relative min-h-[640px] overflow-hidden md:min-h-[88vh]">
        {m.backdropUrl && (
          <img src={m.backdropUrl} alt="" className="kenburns absolute inset-0 h-full w-full object-cover object-[center_20%]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/70 to-bg/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-black/50" />

        <div className="shell relative flex min-h-[640px] flex-col pb-12 pt-20 md:min-h-[88vh] md:pt-24">
          <BackButton fallback={category.route} className="self-start" />
          <div className="mt-auto flex items-end gap-10">
            <Img
              src={m.posterUrl}
              title={m.title}
              eager
              className="hidden aspect-[2/3] w-64 shrink-0 rounded-card shadow-[0_40px_80px_-20px_rgba(0,0,0,.9)] ring-1 ring-white/10 md:block xl:w-72"
            />
            <div className="min-w-0 max-w-3xl">
              <p className="flex flex-wrap items-center gap-2.5 text-sm font-semibold text-white/80">
                {m.certification && (
                  <span className="rounded-[3px] border border-white/50 px-1.5 py-px text-xs font-bold text-white">
                    {m.certification}
                  </span>
                )}
                {m.releaseDate && <span>{formatDate(m.releaseDate)}</span>}
                {m.runtime && <span>· {formatMinutes(m.runtime)}</span>}
                {m.genres?.length > 0 && <span>· {m.genres.slice(0, 3).join(', ')}</span>}
              </p>
              <h1 className="display mt-3 text-[3.4rem] text-white drop-shadow-2xl sm:text-7xl md:text-8xl">{m.title}</h1>
              {m.originalTitle && m.originalTitle !== m.title && (
                <p className="mt-2 text-lg italic text-white/60">{m.originalTitle}</p>
              )}
              {m.directors?.length > 0 && (
                <p className="mt-3 text-base text-white/75">
                  Directed by <span className="font-semibold text-white">{m.directors.join(' & ')}</span>
                </p>
              )}
              {m.tagline && <p className="mt-4 font-display text-2xl tracking-wide text-accent-2">“{m.tagline}”</p>}

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <TrailerButton videoKey={m.trailerKey} title={`${m.title} — trailer`} />
                <StatusControl item={m} glass />
                <FavoriteButton item={m} glass />
                {m.rating != null && (
                  <div className="flex items-center gap-3 pl-1">
                    <ProgressRing value={m.rating / 10} size={50} stroke={4} track="rgba(255,255,255,.18)">
                      <span className="text-sm font-black text-white">{m.rating.toFixed(1)}</span>
                    </ProgressRing>
                    <span className="text-xs leading-tight text-white/65">
                      TMDB score
                      <br />
                      {m.voteCount ? `${compact(m.voteCount)} votes` : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="shell mt-4 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-12">
          {m.overview && (
            <section>
              <SectionHeader title="The Story" />
              <ExpandableText text={m.overview} lines={6} className="max-w-3xl text-lg leading-relaxed text-fg-2" />
            </section>
          )}

          {m.cast?.length > 0 && (
            <section>
              <SectionHeader title="Cast" />
              <PeopleRail people={m.cast} round inset />
            </section>
          )}

          {crew.length > 0 && (
            <section>
              <SectionHeader title="Crew" />
              <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
                {crew.map(([role, names]) => (
                  <div key={role} className="border-l-2 border-accent pl-4">
                    <dt className="kicker text-[10px] text-muted">{role}</dt>
                    <dd className="mt-1 text-[15px] font-semibold text-fg">{names.slice(0, 3).join(', ')}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <RatingBox
              item={m}
              label={watched ? 'Your rating' : 'Seen it? Rate it'}
              hint={watched ? 'Half stars welcome.' : 'Rating logs the film as watched in your diary.'}
            />
            {watched ? (
              <ReviewBox item={m} />
            ) : (
              <div className="flex flex-col justify-center rounded-card bg-surface p-5 ring-1 ring-line">
                <p className="font-display text-xl text-fg">Your diary</p>
                <p className="mt-1 text-sm text-muted">
                  Mark it as watched to log it with today’s date, then add a rating and a review.
                </p>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <div className="rounded-card bg-surface p-5 ring-1 ring-line">
            <h3 className="kicker text-muted">Details</h3>
            <Facts
              className="mt-2"
              rows={[
                ['Status', m.showStatus],
                ['Released', formatDate(m.releaseDate)],
                ['Runtime', formatMinutes(m.runtime)],
                ['Language', LANGUAGES[m.originalLanguage] || m.originalLanguage?.toUpperCase()],
                ['Budget', money(m.budget)],
                ['Box office', money(m.revenue)],
                ['Studios', m.companies],
                ['Countries', m.countries],
              ]}
            />
          </div>
          {a.entry && (
            <div className="rounded-card bg-surface p-5 ring-1 ring-line">
              <h3 className="kicker text-muted">Your activity</h3>
              <Facts
                className="mt-2"
                rows={[
                  ['Added', formatDate(a.entry.added_at)],
                  ['Watched', watched ? formatDate(a.entry.completed_at) : null],
                  ['Liked', a.favorite ? <Icon key="h" name="heartFill" className="inline h-4 w-4 text-rose-500" /> : null],
                ]}
              />
            </div>
          )}
        </aside>
      </div>

      {m.recommendations?.length > 0 && (
        <div className="shell mt-16">
          <Shelf
            title="More Like This"
            query={{ data: m.recommendations }}
            render={(r) => <PosterCard key={r.externalId} rail item={r} />}
          />
        </div>
      )}
    </article>
  )
}
