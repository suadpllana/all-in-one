import { useState } from 'react'
import { getApi } from '../../api'
import { rawgThumb } from '../../api/rawg'
import { STATUS } from '../../config/categories'
import { useWorldQuery } from '../../hooks/useDiscover'
import { useHdImage } from '../../hooks/useHdImage'
import { useItemActions } from '../../hooks/useItemActions'
import { cn } from '../../lib/cn'
import { formatDate, scoreTone } from '../../lib/format'
import GameCard from '../../components/cards/GameCard'
import Platforms from '../../components/cards/Platforms'
import ProgressControl from '../../components/library/ProgressControl'
import StatusControl, { FavoriteButton } from '../../components/library/StatusControl'
import Icon from '../../components/ui/Icon'
import Img from '../../components/ui/Img'
import Lightbox from '../../components/ui/Lightbox'
import { SectionHeader } from '../../components/ui/Section'
import { BackButton, DetailError, DetailSkeleton, ExpandableText, Facts, RatingBox, ReviewBox } from '../shared/Detail'
import Shelf from '../shared/Shelf'
import { useDetailPage } from '../shared/useDetailPage'

// Game page: a HUD header over an HD screenshot, the Metacritic box, a
// screenshot gallery with lightbox, what players think, and your hours.
export default function GameDetail({ category }) {
  const { data: g, isLoading, error, refetch } = useDetailPage('game')
  if (error) return <DetailError error={error} onRetry={refetch} fallback={category.route} />
  if (isLoading || !g) return <DetailSkeleton />
  return <GameBody g={g} category={category} />
}

const RATING_LABEL = { exceptional: 'Exceptional', recommended: 'Recommended', meh: 'Meh', skip: 'Skip' }

function GameBody({ g, category }) {
  const a = useItemActions(g)
  const [shot, setShot] = useState(null)
  const hd = useHdImage([g.screenshots?.[0], g.backdropUrl, ...(g.backdropAlts || [])])
  const shots = g.screenshots?.length ? g.screenshots : g.backdropAlts || []
  const similar = useWorldQuery(['game-similar', g.externalId], (signal) => getApi('game').byGenres(g.genreIds.slice(0, 2), signal), {
    enabled: g.genreIds?.length > 0,
  })
  const similarData = { ...similar, data: (similar.data || []).filter((x) => x.externalId !== g.externalId) }

  return (
    <article className="page-in">
      <header className="under-top relative min-h-[600px] overflow-hidden [clip-path:polygon(0_0,100%_0,100%_calc(100%-40px),calc(100%-40px)_100%,0_100%)] md:min-h-[78vh]">
        {hd && <img key={hd} src={hd} alt="" className="fade-in absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/80 to-bg/20" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-bg to-transparent" />
        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,.025)_0_1px,transparent_1px_3px)]" />

        <div className="shell relative flex min-h-[600px] flex-col pb-14 pt-20 md:min-h-[78vh] md:pt-24">
          <BackButton fallback={category.route} className="self-start" />
          <div className="mt-auto max-w-3xl">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-accent">
              {[g.developers?.[0], g.releaseDate ? formatDate(g.releaseDate) : 'TBA'].filter(Boolean).join(' // ')}
            </p>
            <h1 className="display mt-3 text-[2.6rem] leading-[0.95] text-fg md:text-7xl">{g.title}</h1>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {g.metacritic != null && (
                <span className="flex items-center gap-2">
                  <span className={cn('chamfer-sm px-3 py-2 font-display text-2xl leading-none', scoreTone(g.metacritic))}>{g.metacritic}</span>
                  <span className="text-xs leading-tight text-muted">
                    Metacritic
                    <br />
                    score
                  </span>
                </span>
              )}
              {g.userRating && (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-fg-2">
                  <Icon name="starFill" className="h-4 w-4 text-gold" /> {g.userRating.toFixed(2)} players
                </span>
              )}
              <Platforms platforms={g.platforms} max={8} size="md" />
              {g.esrb && <span className="rounded-sm px-2 py-1 text-xs font-bold text-fg-2 ring-1 ring-line">{g.esrb}</span>}
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <StatusControl item={g} />
              <FavoriteButton item={g} className="rounded-none" />
              {g.playtime ? (
                <span className="chamfer-sm bg-surface/80 px-3 py-2 font-mono text-xs font-bold text-fg-2 ring-1 ring-line backdrop-blur">
                  ~{g.playtime}H TO BEAT
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className="shell mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-12">
          {(a.status === STATUS.IN_PROGRESS || (a.progress && a.status !== STATUS.COMPLETED)) && (
            <ProgressControl item={g} title="Your playtime" className="chamfer rounded-none" />
          )}

          {shots.length > 0 && (
            <section>
              <SectionHeader title="Screenshots" count={shots.length} />
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {shots.slice(0, 9).map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setShot(i)}
                    aria-label={`Open screenshot ${i + 1}`}
                    className={cn('group relative overflow-hidden', i === 0 && 'col-span-2 row-span-2')}
                  >
                    <Img src={rawgThumb(src, i === 0 ? 1280 : 640)} fallbackSrc={src} className="aspect-video h-full w-full" imgClassName="transition-transform duration-500 group-hover:scale-105" />
                    <span className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                      <Icon name="expand" className="h-6 w-6 text-white" />
                    </span>
                  </button>
                ))}
              </div>
              <Lightbox images={shots} index={shot} onIndex={setShot} onClose={() => setShot(null)} label={`${g.title} screenshot`} />
            </section>
          )}

          {g.overview && (
            <section>
              <SectionHeader title="About" />
              <ExpandableText text={g.overview} lines={7} className="max-w-3xl text-[16px] leading-relaxed text-fg-2" />
              {g.tags?.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {g.tags.map((t) => (
                    <span key={t} className="chamfer-sm bg-surface-2 px-2.5 py-1 text-xs font-semibold text-fg-2">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <RatingBox item={g} className="chamfer rounded-none" hint="Rating logs the game as played." />
            <ReviewBox item={g} className="chamfer rounded-none" />
          </section>
        </div>

        <aside className="space-y-5">
          {g.ratingsBreakdown?.length > 0 && (
            <div className="chamfer bg-surface p-5 ring-1 ring-line">
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-muted">What players say</h3>
              <ul className="mt-4 space-y-3">
                {g.ratingsBreakdown.map((r) => (
                  <li key={r.title}>
                    <div className="flex justify-between text-sm">
                      <span className="text-fg-2">{RATING_LABEL[r.title] || r.title}</span>
                      <span className="font-semibold text-fg">{Math.round(r.percent)}%</span>
                    </div>
                    <div className="mt-1.5 h-2 bg-surface-2">
                      <div className="h-full bg-accent" style={{ width: `${r.percent}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="chamfer bg-surface p-5 ring-1 ring-line">
            <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-muted">Specs</h3>
            <Facts
              className="mt-2"
              rows={[
                ['Developer', g.developers],
                ['Publisher', g.publishers],
                ['Released', g.releaseDate ? formatDate(g.releaseDate) : 'TBA'],
                ['Platforms', g.platformNames],
                ['Genres', g.genres],
                ['Rating', g.esrb],
                ['Achievements', g.achievements],
              ]}
            />
          </div>
          {(g.stores?.length > 0 || g.website) && (
            <div className="chamfer bg-surface p-5 ring-1 ring-line">
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-muted">Get it</h3>
              <div className="mt-3 flex flex-col gap-2">
                {g.stores?.map((s) => (
                  <a
                    key={s.name}
                    href={s.domain ? `https://${s.domain}` : undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="chamfer-sm flex items-center justify-between bg-surface-2 px-4 py-2.5 text-sm font-semibold text-fg transition-colors hover:text-accent"
                  >
                    {s.name}
                    <Icon name="external" className="h-4 w-4 text-muted" />
                  </a>
                ))}
                {g.website && (
                  <a href={g.website} target="_blank" rel="noreferrer" className="chamfer-sm flex items-center justify-between bg-surface-2 px-4 py-2.5 text-sm font-semibold text-fg transition-colors hover:text-accent">
                    Official website
                    <Icon name="globe" className="h-4 w-4 text-muted" />
                  </a>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      <div className="shell mt-16">
        <Shelf title="Similar Games" query={similarData} shape="wide" hideWhenEmpty render={(x) => <GameCard key={x.externalId} rail item={x} />} />
      </div>
    </article>
  )
}
