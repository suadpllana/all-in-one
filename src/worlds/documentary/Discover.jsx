import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { DOC_TOPICS, tmdb } from '../../api/tmdb'
import { STATUS } from '../../config/categories'
import { useDetail, useRecommended, useSection, useWorldQuery } from '../../hooks/useDiscover'
import { useItemActions } from '../../hooks/useItemActions'
import { cn } from '../../lib/cn'
import { formatMinutes } from '../../lib/duration'
import { gridClass } from '../../lib/grid'
import { detailPath } from '../../lib/paths'
import PosterCard from '../../components/cards/PosterCard'
import { Button } from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Img from '../../components/ui/Img'
import { SectionHeader } from '../../components/ui/Section'
import { GridSkeleton, Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/States'
import { LazyTrailerButton } from '../shared/Detail'
import Shelf from '../shared/Shelf'
import { topicsOf } from './lib'
import { Deck, StoryCard } from './parts'

// Documentaries — "the magazine". A cover story, a table of contents by
// topic, an editor's-picks spread, new & noteworthy, and a most-watched
// column, set in editorial serif type.
export default function DocDiscover() {
  const [params, setParams] = useSearchParams()
  const topic = params.get('topic')
  const trending = useSection('documentary', 'trending')
  const topRated = useSection('documentary', 'topRated')
  const fresh = useSection('documentary', 'newReleases')
  const recommended = useRecommended('documentary')
  const [issue] = useState(() => {
    const d = new Date()
    const start = new Date(d.getFullYear(), 0, 1)
    return { no: Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7), month: d.toLocaleString('en', { month: 'long', year: 'numeric' }) }
  })

  return (
    <div className="shell pb-6 pt-8 md:pt-10">
      {/* Masthead rule */}
      <div className="flex items-center gap-4 border-y border-line py-2.5 text-[11px] font-bold uppercase tracking-[0.3em] text-muted">
        <span className="text-accent">Field Notes</span>
        <span className="hidden sm:inline">Issue {issue.no}</span>
        <span className="ml-auto">{issue.month}</span>
      </div>

      {topic ? (
        <TopicPage topic={DOC_TOPICS.find((t) => String(t.id) === topic)} onClose={() => setParams({})} />
      ) : (
        <div className="space-y-16">
          <CoverStory query={trending} />
          <Contents onPick={(id) => setParams({ topic: String(id) })} />
          <EditorsPicks query={topRated} />
          <Shelf
            kicker="Just released"
            title="New & Noteworthy"
            query={{ ...fresh, data: (fresh.data || []).filter((d) => d.backdropUrl) }}
            shape="wide"
            render={(d) => <StoryCard key={d.externalId} rail item={d} />}
          />
          <MostWatched query={trending} />
          <Shelf
            kicker="From your watch history"
            title="You Might Also Like"
            query={recommended}
            hideWhenEmpty
            render={(d) => <PosterCard key={d.externalId} rail item={d} />}
          />
        </div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------- cover story */

function CoverStory({ query }) {
  const { data, isLoading, error, refetch } = query
  const d = (data || []).find((x) => x.backdropUrl)
  if (isLoading) return <Skeleton className="mt-8 h-[520px] rounded-card" />
  if (error) return <ErrorState className="mt-8" error={error} onRetry={refetch} />
  if (!d) return null
  return <Cover item={d} />
}

function Cover({ item }) {
  // The list payload has no credits; the detail fills in the byline.
  const { data } = useDetail('documentary', item.externalId)
  const d = data ? { ...item, ...data } : item
  const a = useItemActions(d)
  const topics = topicsOf(d)
  return (
    <section className="rise mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
      <div className="flex flex-col justify-center">
        <p className="kicker text-accent">The cover story{topics[0] ? ` · ${topics[0]}` : ''}</p>
        <h1 className="mt-4 font-display text-6xl leading-[0.95] text-fg md:text-7xl xl:text-8xl">
          <Link to={detailPath(d)} className="hover:text-accent">
            {d.title}
          </Link>
        </h1>
        <Deck text={d.tagline || d.overview} lines={4} className="mt-5 text-lg italic leading-relaxed md:text-xl" />
        <p className="mt-5 text-sm text-muted">
          {d.directors?.length ? (
            <>
              Directed by <span className="font-semibold text-fg">{d.directors.join(' & ')}</span> ·{' '}
            </>
          ) : null}
          {[d.year, formatMinutes(d.runtime)].filter(Boolean).join(' · ')}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <LazyTrailerButton item={d} variant="primary" label="Watch the trailer" />
          <Button
            variant="surface"
            size="lg"
            icon={a.status === STATUS.WISHLIST ? 'check' : 'bookmark'}
            onClick={() => a.setStatus(STATUS.WISHLIST)}
          >
            {a.status === STATUS.WISHLIST ? 'Saved' : 'Save for later'}
          </Button>
        </div>
      </div>
      <figure className="relative">
        <Link to={detailPath(d)} className="group block overflow-hidden rounded-card">
          <Img src={d.backdropUrl} title={d.title} eager className="aspect-[4/3] w-full md:aspect-[16/11]" imgClassName="transition-transform duration-[1.2s] group-hover:scale-105" />
        </Link>
        <figcaption className="mt-3 flex items-center gap-2 text-xs italic text-muted">
          <span className="h-px w-6 bg-accent" />
          A still from <span className="not-italic font-semibold text-fg-2">{d.title}</span>
          {d.year ? ` (${d.year})` : ''}
        </figcaption>
      </figure>
    </section>
  )
}

/* ------------------------------------------------------------- contents */

function Contents({ onPick }) {
  return (
    <section className="rise">
      <SectionHeader kicker="In this issue" title="Contents" />
      <ol className="grid grid-cols-1 border-t border-line sm:grid-cols-2 lg:grid-cols-3">
        {DOC_TOPICS.map((t, i) => (
          <li key={t.id} className="border-b border-line sm:odd:border-r lg:border-r lg:[&:nth-child(3n)]:border-r-0">
            <button type="button" onClick={() => onPick(t.id)} className="group flex w-full items-start gap-5 px-1 py-6 text-left sm:px-5">
              <span className="font-display text-4xl leading-none text-accent">{String(i + 1).padStart(2, '0')}</span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 font-display text-3xl leading-tight text-fg transition-colors group-hover:text-accent">
                  {t.name}
                  <Icon name="arrowRight" className="h-5 w-5 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
                </span>
                <span className="mt-1 block font-read text-sm italic text-muted">{t.blurb}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}

function TopicPage({ topic, onClose }) {
  const q = useWorldQuery(['doc-topic', topic?.id], (signal) => tmdb.documentary.byTopic(topic.id, signal), { enabled: Boolean(topic) })
  if (!topic) return null
  return (
    <section className="page-in mt-10">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-8">
        <div>
          <p className="kicker text-accent">Section</p>
          <h1 className="mt-2 font-display text-6xl text-fg md:text-8xl">{topic.name}</h1>
          <p className="mt-3 font-read text-lg italic text-fg-2">{topic.blurb}</p>
        </div>
        <Button variant="surface" size="sm" icon="x" onClick={onClose}>
          Back to the issue
        </Button>
      </div>
      {q.isLoading ? (
        <GridSkeleton shape="wide" />
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={q.refetch} />
      ) : (
        <div className={gridClass('wide')}>
          {(q.data || []).map((d) => (
            <StoryCard key={d.externalId} item={d} />
          ))}
        </div>
      )}
    </section>
  )
}

/* ---------------------------------------------------------- editor's picks */

function EditorsPicks({ query }) {
  const { data, isLoading, error, refetch } = query
  const items = (data || []).filter((d) => d.backdropUrl).slice(0, 5)
  return (
    <section className="rise">
      <SectionHeader kicker="The essentials" title="Editor’s Picks" subtitle="The most acclaimed documentaries ever made" />
      {isLoading ? (
        <Skeleton className="h-[560px] rounded-card" />
      ) : error ? (
        <ErrorState compact error={error} onRetry={refetch} />
      ) : items.length ? (
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <StoryCard item={items[0]} size="lg" />
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2">
            {items.slice(1).map((d) => (
              <StoryCard key={d.externalId} item={d} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

/* ---------------------------------------------------------- most watched */

function MostWatched({ query }) {
  const items = (query.data || []).slice(0, 8)
  if (!items.length) return null
  return (
    <section className="rise">
      <SectionHeader kicker="Popular this week" title="Most Watched" />
      <ol className="grid grid-cols-1 gap-x-10 md:grid-cols-2">
        {items.map((d, i) => (
          <li key={d.externalId} className="group relative flex items-center gap-5 border-b border-line py-4">
            <span className={cn('w-10 shrink-0 font-display text-5xl leading-none', i < 3 ? 'text-accent' : 'text-muted/50')}>{i + 1}</span>
            <div className="min-w-0 flex-1">
              <Link to={detailPath(d)} className="block font-display text-2xl leading-tight text-fg after:absolute after:inset-0 group-hover:text-accent">
                {d.title}
              </Link>
              <p className="mt-1 truncate text-xs font-semibold uppercase tracking-wider text-muted">
                {[topicsOf(d)[0], d.year, formatMinutes(d.runtime)].filter(Boolean).join(' · ')}
              </p>
            </div>
            <Img src={d.posterUrl} title={d.title} className="aspect-[2/3] w-12 shrink-0 rounded-sm" />
          </li>
        ))}
      </ol>
    </section>
  )
}
