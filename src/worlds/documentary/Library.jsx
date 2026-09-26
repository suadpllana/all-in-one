import { useState } from 'react'
import { Link } from 'react-router-dom'
import { STATUS } from '../../config/categories'
import { useItemActions } from '../../hooks/useItemActions'
import { cn } from '../../lib/cn'
import { formatMinutes } from '../../lib/duration'
import { formatDate } from '../../lib/format'
import { detailPath } from '../../lib/paths'
import { toStars } from '../../lib/rating'
import QuickActions from '../../components/library/QuickActions'
import { Button } from '../../components/ui/Button'
import Img from '../../components/ui/Img'
import { GridSkeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/States'
import { Stars } from '../../components/ui/Stars'
import { useLibraryItems } from '../shared/library'
import LibraryToolbar, { Summary } from '../shared/LibraryToolbar'
import PickForMe from '../shared/PickForMe'
import { topicsOf } from './lib'
import { Deck } from './parts'

const COPY = {
  plan: ['Your reading list, for screens', 'Watchlist'],
  progress: ['Half-way through', 'Watching'],
  done: ['Your viewing journal', 'Watched'],
}

export default function DocLibrary({ category, tab, query }) {
  const [sort, setSort] = useState('recent')
  const { all, items, isLoading } = useLibraryItems('documentary', tab.status, query, sort)
  const minutes = all.reduce((n, d) => n + (d.runtime || 95), 0)
  const done = tab.status === STATUS.COMPLETED
  const [kicker, title] = COPY[tab.key]

  return (
    <div className="shell page-in py-8 md:py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-line pb-8">
        <div>
          <p className="kicker text-accent">{kicker}</p>
          <h1 className="mt-2 font-display text-6xl text-fg md:text-7xl">{title}</h1>
        </div>
        {tab.key === 'plan' && (
          <PickForMe
            items={all}
            label="Choose tonight’s story"
            heading="Tonight’s documentary"
            wide
            describe={(d) => [topicsOf(d)[0], d.year, formatMinutes(d.runtime)].filter(Boolean).join(' · ')}
          />
        )}
      </header>

      {isLoading ? (
        <GridSkeleton shape="wide" />
      ) : !all.length ? (
        <EmptyState icon="compass" title={done ? 'Your journal is empty' : 'Nothing saved yet'} hint="True stories worth your evening are a tap away in this week’s issue.">
          <Button as={Link} to={category.route} variant="primary" icon="compass">
            Read this week’s issue
          </Button>
        </EmptyState>
      ) : (
        <>
          <LibraryToolbar
            summary={
              <Summary
                stats={[
                  { label: 'Documentaries', value: all.length },
                  { label: done ? 'Hours watched' : 'Hours to watch', value: Math.round(minutes / 60) },
                ]}
              />
            }
            sorts={done ? ['recent', 'myRating', 'rating', 'az'] : ['recent', 'shortest', 'rating', 'newest', 'az']}
            sort={sort}
            onSort={setSort}
          />
          <ol className="mt-8 divide-y divide-line border-y border-line">
            {items.map((d, i) => (
              <Entry key={d.externalId} item={d} index={i} done={done} />
            ))}
          </ol>
        </>
      )}
    </div>
  )
}

function Entry({ item, index, done }) {
  const a = useItemActions(item)
  const stars = toStars(a.userRating)
  return (
    <li className="group relative grid grid-cols-[1fr] gap-5 py-6 sm:grid-cols-[48px_220px_1fr_auto] sm:items-center">
      <span className="hidden font-display text-4xl leading-none text-muted/50 sm:block">{String(index + 1).padStart(2, '0')}</span>
      <Img src={item.backdropUrl || item.posterUrl} title={item.title} className="aspect-[3/2] w-full rounded-card sm:w-[220px]" imgClassName="transition-transform duration-700 group-hover:scale-105" />
      <div className="min-w-0">
        <p className="kicker text-[10px] text-accent">{topicsOf(item)[0] || 'Documentary'}</p>
        <Link to={detailPath(item)} className="mt-1 block font-display text-3xl leading-tight text-fg after:absolute after:inset-0 group-hover:text-accent">
          {item.title}
        </Link>
        <Deck text={item._review ? `“${item._review}”` : item.overview} lines={2} className={cn('mt-2 text-sm leading-relaxed', item._review && 'italic')} />
        <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted">
          {[item.year, formatMinutes(item.runtime), done && item._completedAt ? `Watched ${formatDate(item._completedAt)}` : null].filter(Boolean).join('  ·  ')}
        </p>
      </div>
      <div className="relative z-10 flex items-center gap-3 sm:flex-col sm:items-end">
        {done && stars != null && <Stars value={stars} size={15} />}
        <QuickActions item={item} row compact className="opacity-100" />
      </div>
    </li>
  )
}
