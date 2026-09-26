import { Link } from 'react-router-dom'
import { FORMAT_LABEL, SOURCE_LABEL } from '../../api/anime'
import { STATUS } from '../../config/categories'
import { useItemActions } from '../../hooks/useItemActions'
import { compact, formatDate } from '../../lib/format'
import { detailPath } from '../../lib/paths'
import ProgressControl from '../../components/library/ProgressControl'
import StatusControl, { FavoriteButton } from '../../components/library/StatusControl'
import Icon from '../../components/ui/Icon'
import Img from '../../components/ui/Img'
import { SectionHeader } from '../../components/ui/Section'
import {
  BackButton,
  DetailError,
  DetailSkeleton,
  ExpandableText,
  Facts,
  RatingBox,
  ReviewBox,
  TrailerButton,
} from '../shared/Detail'
import Shelf from '../shared/Shelf'
import { useDetailPage } from '../shared/useDetailPage'
import { useAiring } from './lib'
import { AnimeCard, GenreChip, Petals, ScorePill } from './parts'

const SEASON_NAME = { WINTER: 'Winter', SPRING: 'Spring', SUMMER: 'Summer', FALL: 'Fall' }
const STATUS_NAME = {
  RELEASING: 'Releasing',
  FINISHED: 'Finished',
  NOT_YET_RELEASED: 'Not yet released',
  CANCELLED: 'Cancelled',
  HIATUS: 'On hiatus',
}
const dateOf = (d) => (d?.year ? formatDate(new Date(d.year, (d.month || 1) - 1, d.day || 1)) : null)

// Anime page in the AniList idiom: banner + key art, a facts sidebar with
// rankings and where to stream, characters paired with their voice actors,
// relations and recommendations.
export default function AnimeDetail({ category }) {
  const { data: a, isLoading, error, refetch } = useDetailPage('anime')
  if (error) return <DetailError error={error} onRetry={refetch} fallback={category.route} />
  if (isLoading || !a) return <DetailSkeleton />
  return <AnimeBody a={a} category={category} />
}

function AnimeBody({ a, category }) {
  const act = useItemActions(a)
  const airing = useAiring(a)
  const glow = a.color || 'var(--accent)'

  return (
    <article className="page-in">
      <header className="under-top relative">
        <div className="relative h-[34vh] min-h-[260px] overflow-hidden md:h-[46vh]">
          {a.backdropUrl ? (
            <img src={a.backdropUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <img src={a.posterUrl} alt="" className="h-full w-full scale-125 object-cover opacity-60 blur-2xl" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/30 to-black/40" />
          <Petals />
          <div className="shell absolute inset-x-0 top-20 md:top-24">
            <BackButton fallback={category.route} />
          </div>
        </div>
        <div className="shell relative -mt-28 flex flex-col gap-6 md:-mt-36 md:flex-row md:items-end md:gap-9">
          <div className="relative w-40 shrink-0 md:w-56">
            <div className="absolute -inset-4 rounded-[28px] opacity-50 blur-2xl" style={{ background: glow }} />
            <Img src={a.posterUrl} title={a.title} eager className="relative aspect-[2/3] w-full rounded-[20px] shadow-2xl ring-2 ring-white/15" />
          </div>
          <div className="min-w-0 pb-2">
            <h1 className="font-display text-4xl leading-[1.05] text-fg md:text-6xl">{a.title}</h1>
            <p className="mt-2 text-sm text-muted">
              {[a.titleRomaji !== a.title ? a.titleRomaji : null].filter(Boolean).join(' · ')}
              {a.titleNative && (
                <span lang="ja" className="ml-2 text-fg-2">
                  {a.titleNative}
                </span>
              )}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <ScorePill value={a.rating} className="bg-surface-2 text-sm" />
              {[FORMAT_LABEL[a.format], a.episodes ? `${a.episodes} eps` : null, a.runtime ? `${a.runtime} min` : null, a.season ? `${SEASON_NAME[a.season]} ${a.year}` : a.year]
                .filter(Boolean)
                .map((t) => (
                  <span key={t} className="rounded-full bg-surface-2 px-3 py-1 text-xs font-bold text-fg-2 ring-1 ring-line">
                    {t}
                  </span>
                ))}
            </div>
            {a.rankings?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {a.rankings.map((r) => (
                  <span key={r.label} className="flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent">
                    <Icon name={r.type === 'RATED' ? 'starFill' : 'heartFill'} className="h-3.5 w-3.5" />#{r.rank} {r.label}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <StatusControl item={a} />
              <FavoriteButton item={a} />
              <TrailerButton videoKey={a.trailerKey} variant="surface" size="md" label="Trailer" title={`${a.title} — trailer`} />
            </div>
          </div>
        </div>
      </header>

      <div className="shell mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[272px_minmax(0,1fr)]">
        <aside className="order-2 space-y-5 lg:order-1">
          {airing && (
            <div className="rounded-card bg-accent-grad p-5 text-white shadow-[0_20px_40px_-20px_var(--accent)]">
              <p className="text-xs font-bold uppercase tracking-widest opacity-85">Airing</p>
              <p className="mt-1 font-display text-2xl">Ep {airing.episode} in {airing.in}</p>
              <p className="mt-1 text-sm opacity-85">
                {new Date(airing.at).toLocaleString('en', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          )}
          <div className="rounded-card bg-surface p-5 ring-1 ring-line">
            <Facts
              rows={[
                ['Format', FORMAT_LABEL[a.format] || a.format],
                ['Episodes', a.episodes],
                ['Episode length', a.runtime ? `${a.runtime} min` : null],
                ['Status', STATUS_NAME[a.airingStatus] || a.airingStatus],
                ['Start date', dateOf(a.startDate)],
                ['End date', dateOf(a.endDate)],
                ['Season', a.season ? `${SEASON_NAME[a.season]} ${a.year}` : null],
                ['Studios', a.studios],
                ['Source', SOURCE_LABEL[a.source] || a.source],
                ['Average score', a.rating != null ? `${Math.round(a.rating * 10)}%` : null],
                ['Popularity', a.popularity ? compact(a.popularity) : null],
                ['Favourites', a.favourites ? compact(a.favourites) : null],
              ]}
            />
          </div>
          {a.streaming?.length > 0 && (
            <div className="rounded-card bg-surface p-5 ring-1 ring-line">
              <h3 className="kicker text-muted">Where to watch</h3>
              <div className="mt-3 flex flex-col gap-2">
                {a.streaming.map((l) => (
                  <a
                    key={l.site + l.url}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-ui bg-surface-2 px-4 py-2.5 text-sm font-semibold text-fg ring-1 ring-line transition-colors hover:ring-accent-line"
                  >
                    {l.site}
                    <Icon name="external" className="h-4 w-4 text-muted" />
                  </a>
                ))}
              </div>
            </div>
          )}
          {a.tags?.length > 0 && (
            <div className="rounded-card bg-surface p-5 ring-1 ring-line">
              <h3 className="kicker text-muted">Tags</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.tags.map((t) => (
                  <span key={t} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-fg-2">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </aside>

        <div className="order-1 min-w-0 space-y-12 lg:order-2">
          {(act.status === STATUS.IN_PROGRESS || (act.progress && act.status !== STATUS.COMPLETED)) && <ProgressControl item={a} title="Episodes watched" />}
          <section>
            <SectionHeader title="Synopsis" />
            <div className="mb-4 flex flex-wrap gap-1.5">
              {(a.genres || a.genreIds || []).map((g) => (
                <GenreChip key={g} name={g} />
              ))}
            </div>
            <ExpandableText text={a.overview} lines={6} className="max-w-3xl text-[16px] leading-relaxed text-fg-2" />
          </section>

          {a.characters?.length > 0 && (
            <section>
              <SectionHeader title="Characters & Voice Actors" />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {a.characters.map((c) => (
                  <div key={c.name} className="grid grid-cols-[64px_1fr_1fr_64px] items-stretch overflow-hidden rounded-card bg-surface ring-1 ring-line">
                    <Img src={c.image} alt="" className="h-24 w-16" />
                    <div className="min-w-0 p-3">
                      <p className="truncate text-sm font-bold text-fg">{c.name}</p>
                      <p className="text-xs text-muted">{c.role}</p>
                    </div>
                    {c.va ? (
                      <>
                        <div className="min-w-0 p-3 text-right">
                          <p className="truncate text-sm font-bold text-fg">{c.va.name}</p>
                          <p className="text-xs text-muted">Japanese</p>
                        </div>
                        <Img src={c.va.image} alt="" className="h-24 w-16" />
                      </>
                    ) : (
                      <span className="col-span-2" />
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {a.relations?.length > 0 && (
            <section>
              <SectionHeader title="Relations" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {a.relations.slice(0, 9).map((r) => {
                  const body = (
                    <>
                      {r.posterUrl ? <Img src={r.posterUrl} alt="" className="h-24 w-16 shrink-0" /> : <span className="grid h-24 w-16 shrink-0 place-items-center bg-surface-2 text-muted"><Icon name="book" className="h-5 w-5" /></span>}
                      <div className="min-w-0 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-accent">{r.relation}</p>
                        <p className="mt-0.5 line-clamp-2 text-sm font-bold text-fg">{r.title}</p>
                        <p className="text-xs text-muted">{FORMAT_LABEL[r.format] || r.format || r.type}</p>
                      </div>
                    </>
                  )
                  return r.externalId ? (
                    <Link key={r.title + r.relation} to={detailPath({ category: 'anime', externalId: r.externalId })} className="flex overflow-hidden rounded-card bg-surface ring-1 ring-line transition-colors hover:ring-accent-line">
                      {body}
                    </Link>
                  ) : (
                    <div key={r.title + r.relation} className="flex overflow-hidden rounded-card bg-surface ring-1 ring-line">
                      {body}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <RatingBox item={a} hint="Scored out of five — half stars welcome." />
            {act.status === STATUS.COMPLETED ? (
              <ReviewBox item={a} placeholder="Best episode? Best girl? Say it." />
            ) : (
              <div className="flex flex-col justify-center rounded-card bg-surface p-5 ring-1 ring-line">
                <p className="font-display text-xl text-fg">Track it episode by episode</p>
                <p className="mt-1 text-sm text-muted">Mark it as Watching and use +1 after each episode — finishing the last one completes it.</p>
              </div>
            )}
          </section>
        </div>
      </div>

      {a.recommendations?.length > 0 && (
        <div className="shell mt-16">
          <Shelf title="Recommendations" query={{ data: a.recommendations }} render={(r) => <AnimeCard key={r.externalId} rail item={r} />} />
        </div>
      )}
    </article>
  )
}
