import { STATUS } from '../../config/categories'
import { useItemActions } from '../../hooks/useItemActions'
import { formatMinutes } from '../../lib/duration'
import { formatDate, LANGUAGES } from '../../lib/format'
import StatusControl, { FavoriteButton } from '../../components/library/StatusControl'
import Img from '../../components/ui/Img'
import { SectionHeader } from '../../components/ui/Section'
import { BackButton, DetailError, DetailSkeleton, ExpandableText, Facts, PeopleRail, RatingBox, ReviewBox, TrailerButton } from '../shared/Detail'
import Shelf from '../shared/Shelf'
import { useDetailPage } from '../shared/useDetailPage'
import { splitLead, topicsOf } from './lib'
import { StoryCard } from './parts'

// A documentary as a long-form feature: headline and deck, a byline, the
// feature image with caption, the story set in a reading face with a drop
// cap, and the facts in the margin.
export default function DocDetail({ category }) {
  const { data: d, isLoading, error, refetch } = useDetailPage('documentary')
  if (error) return <DetailError error={error} onRetry={refetch} fallback={category.route} />
  if (isLoading || !d) return <DetailSkeleton />
  return <Feature d={d} category={category} />
}

function Feature({ d, category }) {
  const a = useItemActions(d)
  const topics = topicsOf(d)
  const featuring = (d.cast || []).filter((c) => c.name).slice(0, 14)
  // The deck is the tagline, or else the synopsis's first sentence — which
  // then leaves the body so it isn't read twice.
  const [lead, rest] = splitLead(d.overview)
  const deck = d.tagline || lead
  const body = d.tagline ? d.overview : rest

  return (
    <article className="page-in">
      <div className="shell pt-6 md:pt-8">
        <BackButton fallback={category.route} glass={false} />
      </div>

      <header className="shell mx-auto mt-10 max-w-5xl text-center">
        <p className="kicker text-accent">{[...topics.slice(0, 2), d.year].filter(Boolean).join(' · ') || 'Documentary'}</p>
        <h1 className="mt-5 font-display text-6xl leading-[0.95] text-fg md:text-8xl">{d.title}</h1>
        {deck && <p className="mx-auto mt-6 max-w-3xl font-read text-xl italic leading-relaxed text-fg-2 md:text-2xl">{deck}</p>}
        <p className="mt-6 text-sm text-muted">
          {d.directors?.length ? (
            <>
              A film by <span className="font-semibold text-fg">{d.directors.join(' & ')}</span>
              {' · '}
            </>
          ) : null}
          {[formatMinutes(d.runtime), d.rating ? `★ ${d.rating.toFixed(1)} on TMDB` : null].filter(Boolean).join(' · ')}
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <TrailerButton videoKey={d.trailerKey} variant="primary" label="Watch the trailer" title={`${d.title} — trailer`} />
          <StatusControl item={d} />
          <FavoriteButton item={d} />
        </div>
      </header>

      {d.backdropUrl && (
        <figure className="shell mt-12">
          <Img src={d.backdropUrl} title={d.title} eager className="aspect-[21/9] w-full rounded-card" />
          <figcaption className="mt-3 flex items-center gap-2 text-xs italic text-muted">
            <span className="h-px w-6 bg-accent" />
            {d.title}
            {d.year ? `, ${d.year}` : ''}
            {d.companies?.[0] ? ` — ${d.companies[0]}` : ''}
          </figcaption>
        </figure>
      )}

      <div className="shell mt-14 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-12">
          {body && (
            <section>
              <ExpandableText text={body} lines={10} className="dropcap max-w-2xl font-read text-[19px] leading-[1.8] text-fg-2" />
            </section>
          )}
          {featuring.length > 0 && (
            <section>
              <SectionHeader title="Featuring" />
              <PeopleRail people={featuring} round inset label="Featuring" />
            </section>
          )}
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <RatingBox item={d} hint={a.status === STATUS.COMPLETED ? 'How did it stay with you?' : 'Rating marks it as watched.'} />
            <ReviewBox item={d} title="Your take" placeholder="What did you learn? What stayed with you?" />
          </section>
        </div>
        <aside className="space-y-5">
          <div className="border-t-2 border-accent bg-surface p-5 ring-1 ring-line">
            <h3 className="kicker text-muted">The facts</h3>
            <Facts
              className="mt-2"
              rows={[
                ['Directed by', d.directors],
                ['Released', formatDate(d.releaseDate)],
                ['Running time', formatMinutes(d.runtime)],
                ['Language', LANGUAGES[d.originalLanguage] || d.originalLanguage?.toUpperCase()],
                ['Topics', topics],
                ['Music', d.composer],
                ['Cinematography', d.cinematographer],
                ['Production', d.companies],
                ['Countries', d.countries],
              ]}
            />
          </div>
        </aside>
      </div>

      {d.recommendations?.length > 0 && (
        <div className="shell mt-16">
          <Shelf
            kicker="Further viewing"
            title="If This Moved You"
            shape="wide"
            query={{ data: d.recommendations.filter((r) => r.backdropUrl) }}
            render={(r) => <StoryCard key={r.externalId} rail item={r} />}
          />
        </div>
      )}
    </article>
  )
}
