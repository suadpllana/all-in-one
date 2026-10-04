import { getApi } from '../../api'
import { STATUS } from '../../config/categories'
import { useWorldQuery } from '../../hooks/useDiscover'
import { useItemActions } from '../../hooks/useItemActions'
import { compact, formatDate } from '../../lib/format'
import BookCard from '../../components/cards/BookCard'
import ProgressControl from '../../components/library/ProgressControl'
import StatusControl, { FavoriteButton } from '../../components/library/StatusControl'
import Icon from '../../components/ui/Icon'
import { SectionHeader } from '../../components/ui/Section'
import { Stars } from '../../components/ui/Stars'
import { BackButton, DetailError, ExpandableText, Facts, RatingBox, ReviewBox } from '../shared/Detail'
import { Skeleton } from '../../components/ui/Skeleton'
import Shelf from '../shared/Shelf'
import { useDetailPage } from '../shared/useDetailPage'
import { AuthorLine, Book3D } from './parts'

// A book's page: the object itself (a 3D book as thick as its page count),
// literary type, what readers are doing with it, and your page tracker and
// notes.
export default function BookDetail({ category }) {
  const { data: b, isLoading, error, refetch } = useDetailPage('book')
  if (error) return <DetailError error={error} onRetry={refetch} fallback={category.route} />
  if (isLoading || !b) {
    return (
      <div className="shell grid grid-cols-1 gap-12 py-12 md:grid-cols-[280px_1fr]">
        <Skeleton className="aspect-[2/3] w-56 rounded-md md:w-full" />
        <div className="space-y-4 pt-4">
          <Skeleton className="h-14 w-3/4" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-10 w-96 rounded-ui" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
        </div>
      </div>
    )
  }
  return <BookBody b={b} category={category} />
}

function BookBody({ b, category }) {
  const a = useItemActions(b)
  const reading = a.status === STATUS.IN_PROGRESS
  const done = a.status === STATUS.COMPLETED
  const similarKey = b.genres?.[0] || b.authors?.[0]
  const similar = useWorldQuery(['book-similar', b.externalId, similarKey], (signal) => getApi('book').byGenres([similarKey], signal), {
    enabled: Boolean(similarKey),
  })
  const similarData = { ...similar, data: (similar.data || []).filter((x) => x.externalId !== b.externalId) }

  return (
    <article className="page-in">
      <div className="shell pt-6 md:pt-8">
        <BackButton fallback={category.route} glass={false} />
      </div>

      <div className="shell mt-8 grid grid-cols-1 gap-10 md:grid-cols-[minmax(220px,300px)_1fr] md:gap-14">
        <div className="md:sticky md:top-24 md:self-start">
          <div className="mx-auto w-52 md:w-full">
            <Book3D item={b} eager />
          </div>
          <div className="mt-10 hidden md:block">
            <StatusControl item={b} vertical className="w-full" />
          </div>
        </div>

        <div className="min-w-0">
          <h1 className="font-display text-5xl leading-[1.02] text-fg md:text-6xl">{b.title}</h1>
          {b.subtitle && <p className="mt-2 font-display text-2xl italic text-fg-2">{b.subtitle}</p>}
          <AuthorLine authors={b.authors} className="mt-3 text-xl" />

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
            {b.rating != null && (
              <span className="flex items-center gap-2">
                <Stars value={Math.round(b.rating) / 2} size={18} />
                <span className="font-display text-xl text-fg">{(b.rating / 2).toFixed(2)}</span>
                {b.ratingsCount ? <span>{b.ratingsCount.toLocaleString()} ratings</span> : null}
              </span>
            )}
            {b.pageCount && (
              <span className="flex items-center gap-1.5">
                <Icon name="book" className="h-4 w-4" />
                {b.pageCount} pages · about {Math.round((b.pageCount * 1.5) / 60)} hours
              </span>
            )}
            {b.year && (
              <span className="flex items-center gap-1.5">
                <Icon name="calendar" className="h-4 w-4" />
                First published {b.year}
              </span>
            )}
          </div>

          {b.shelves && (
            <div className="mt-6 grid max-w-xl grid-cols-3 gap-3">
              {[
                ['Want to read', b.shelves.want, 'bookmark'],
                ['Reading now', b.shelves.reading, 'book'],
                ['Have read', b.shelves.read, 'check'],
              ].map(([label, n, icon]) => (
                <div key={label} className="paper rounded-2xl px-4 py-3 ring-1 ring-line">
                  <p className="flex items-center gap-1.5 text-xs text-muted">
                    <Icon name={icon} className="h-3.5 w-3.5" />
                    {label}
                  </p>
                  <p className="mt-0.5 font-display text-2xl text-fg">{compact(n)}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <StatusControl item={b} className="md:hidden" />
            <FavoriteButton item={b} />
            {done && a.entry?.completed_at && <span className="text-sm text-muted">Finished {formatDate(a.entry.completed_at)}</span>}
          </div>

          {(reading || (a.progress && !done)) && <ProgressControl item={b} title="Your place in the book" className="paper mt-8" />}

          {b.overview && (
            <section className="mt-12">
              <SectionHeader title="About this book" />
              <ExpandableText text={b.overview} lines={8} className="dropcap max-w-2xl font-read text-[17px] leading-[1.75] text-fg-2" />
            </section>
          )}

          {b.genres?.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {b.genres.map((g) => (
                <span key={g} className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold capitalize text-fg-2 ring-1 ring-line">
                  {g}
                </span>
              ))}
            </div>
          )}

          <section className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <RatingBox item={b} hint={done ? 'Five stars means you’d press it on a friend.' : 'Rating marks the book as read.'} />
            <ReviewBox item={b} />
          </section>

          <div className="paper mt-5 rounded-card p-5 ring-1 ring-line">
            <h3 className="kicker text-muted">Edition</h3>
            <Facts
              className="mt-2"
              rows={[
                ['Publisher', b.publisher],
                ['Published', b.publishDate || formatDate(b.releaseDate)],
                ['Pages', b.pageCount],
                ['ISBN', b.isbn],
                ['Editions', b.editionCount],
              ]}
            />
          </div>
        </div>
      </div>

      <div className="shell mt-16">
        <Shelf
          title="Readers Also Enjoyed"
          query={similarData}
          shape="book"
          gap="gap-8"
          hideWhenEmpty
          render={(x) => <BookCard key={x.externalId} rail shelf item={x} />}
        />
      </div>
    </article>
  )
}
