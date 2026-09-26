import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BOOK_SHELVES, googleBooks } from '../../api/googleBooks'
import { STATUS } from '../../config/categories'
import { useDetail, useRecommended, useSection, useWorldQuery } from '../../hooks/useDiscover'
import { useInView } from '../../hooks/useInView'
import { useItemActions } from '../../hooks/useItemActions'
import { useLibrary } from '../../hooks/useLibrary'
import { toDate } from '../../lib/format'
import { detailPath } from '../../lib/paths'
import { getProgress } from '../../lib/progress'
import BookCard from '../../components/cards/BookCard'
import { Button } from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Img from '../../components/ui/Img'
import { ProgressBar } from '../../components/ui/Progress'
import { SectionHeader } from '../../components/ui/Section'
import { RowSkeleton, Skeleton } from '../../components/ui/Skeleton'
import { Stars } from '../../components/ui/Stars'
import { useLibraryItems } from '../shared/library'
import Shelf from '../shared/Shelf'
import { AuthorLine, Book3D, ReadingChallenge } from './parts'

// Books — "the reading room". A book of the day, what you're reading with
// your yearly challenge, and wooden shelves by subject.
export default function BookDiscover() {
  const trending = useSection('book', 'trending')
  const recommended = useRecommended('book')

  return (
    <div className="pb-6">
      <ReadingRoom trending={trending} />
      <div className="shell mt-6 space-y-14">
        <Shelf
          kicker="What everyone’s reading"
          title="Trending This Week"
          query={trending}
          shape="book"
          gap="gap-8"
          render={(b) => <BookCard key={b.externalId} rail shelf item={b} />}
        />
        <Shelf
          kicker="Picked for you"
          title="Readers Like You Loved"
          query={recommended}
          shape="book"
          gap="gap-8"
          hideWhenEmpty
          render={(b) => <BookCard key={b.externalId} rail shelf item={b} />}
        />
        {BOOK_SHELVES.map((s) => (
          <SubjectShelf key={s.subject} shelf={s} />
        ))}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------- reading room */

function ReadingRoom({ trending }) {
  const { items } = useLibrary()
  const year = new Date().getFullYear()
  const readThisYear = items.filter(
    (r) => r.category === 'book' && r.status === STATUS.COMPLETED && toDate(r.completed_at)?.getFullYear() === year,
  ).length
  const reading = useLibraryItems('book', STATUS.IN_PROGRESS, '', 'progress').items

  // Book of the day: rotates through this week's trending list by date.
  const list = (trending.data || []).filter((b) => b.posterUrl)
  const [dayIndex] = useState(() => Math.floor(Date.now() / 86400000))
  const pick = list.length ? list[dayIndex % Math.min(list.length, 10)] : null

  return (
    <section className="shell pt-8 md:pt-12">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {pick ? <BookOfTheDay item={pick} /> : <Skeleton className="h-[420px] rounded-3xl" />}
        <div className="flex flex-col gap-4">
          <ReadingChallenge readThisYear={readThisYear} />
          {reading.length > 0 ? (
            <div className="paper flex-1 rounded-2xl p-5 ring-1 ring-line">
              <p className="kicker text-accent">On your nightstand</p>
              <ul className="mt-3 space-y-4">
                {reading.slice(0, 3).map((b) => (
                  <NightstandBook key={b.externalId} item={b} />
                ))}
              </ul>
              {reading.length > 3 && (
                <Link to="/books/progress" className="mt-3 inline-block text-sm font-semibold text-accent hover:underline">
                  +{reading.length - 3} more
                </Link>
              )}
            </div>
          ) : (
            <div className="paper flex flex-1 flex-col justify-center rounded-2xl p-6 ring-1 ring-line">
              <Icon name="book" className="h-8 w-8 text-accent" />
              <p className="mt-3 font-display text-2xl text-fg">Nothing on the nightstand</p>
              <p className="mt-1 text-sm text-muted">Start a book and track it page by page — Vault will tell you how long is left.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function BookOfTheDay({ item }) {
  // The trending list is sparse; the detail call fills in the blurb/pages.
  const { data } = useDetail('book', item.externalId)
  const b = data ? { ...item, ...data, posterUrl: item.posterUrl || data.posterUrl } : item
  const a = useItemActions(b)
  return (
    <article className="paper relative overflow-hidden rounded-3xl p-6 ring-1 ring-line md:p-9">
      <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent-2/15 blur-3xl" />
      <div className="relative flex flex-col gap-8 sm:flex-row sm:items-center">
        <Link to={detailPath(b)} className="mx-auto w-40 shrink-0 sm:mx-0 md:w-48">
          <Book3D item={b} eager />
        </Link>
        <div className="min-w-0">
          <p className="kicker text-accent">Book of the day</p>
          <h1 className="mt-2 font-display text-4xl leading-[1.05] text-fg md:text-5xl">
            <Link to={detailPath(b)} className="hover:text-accent">
              {b.title}
            </Link>
          </h1>
          <AuthorLine authors={b.authors} className="mt-2 text-lg" />
          {b.rating != null && (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted">
              <Stars value={Math.round(b.rating) / 2} size={15} />
              <span className="font-semibold text-fg">{(b.rating / 2).toFixed(2)}</span>
              {b.ratingsCount ? <span>· {b.ratingsCount.toLocaleString()} ratings</span> : null}
            </p>
          )}
          {b.overview ? (
            <p className="mt-4 line-clamp-4 font-read text-[15px] leading-relaxed text-fg-2">{b.overview}</p>
          ) : (
            <div className="mt-4 space-y-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Button
              variant={a.status === STATUS.WISHLIST ? 'soft' : 'primary'}
              icon={a.status === STATUS.WISHLIST ? 'check' : 'bookmark'}
              onClick={() => a.setStatus(STATUS.WISHLIST)}
            >
              {a.status === STATUS.WISHLIST ? 'On your list' : 'Want to read'}
            </Button>
            <Button variant="surface" icon="book" onClick={() => a.setStatus(STATUS.IN_PROGRESS)}>
              {a.status === STATUS.IN_PROGRESS ? 'Reading' : 'Start reading'}
            </Button>
            {b.pageCount && <span className="self-center text-sm text-muted">{b.pageCount} pages · ~{Math.round((b.pageCount * 1.5) / 60)}h read</span>}
          </div>
        </div>
      </div>
    </article>
  )
}

function NightstandBook({ item }) {
  const a = useItemActions(item)
  const info = getProgress({ ...item, _progress: a.progress })
  return (
    <li className="flex items-center gap-4">
      <Link to={detailPath(item)} className="shrink-0">
        <Img src={item.posterUrl} title={item.title} className="aspect-[2/3] w-12 rounded-[3px] shadow-md ring-1 ring-line" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={detailPath(item)} className="block truncate font-display text-[17px] text-fg hover:text-accent">
          {item.title}
        </Link>
        <ProgressBar value={info?.pct ?? 0} className="mt-1.5" />
        <p className="mt-1 text-xs text-muted">
          {info?.detail}
          {info?.left ? ` · ${info.left}` : ''}
        </p>
      </div>
      <Button size="sm" variant="surface" icon="plus" onClick={() => a.bump(10)} title="Read 10 more pages">
        10p
      </Button>
    </li>
  )
}

/* -------------------------------------------------------- subject shelves */

// Fetches only once scrolled near, so eight shelves don't all load at once.
function SubjectShelf({ shelf }) {
  const [ref, inView] = useInView()
  const q = useWorldQuery(['book-subject', shelf.subject], (signal) => googleBooks.subject(shelf.subject, signal), {
    enabled: inView,
  })
  return (
    <div ref={ref} className="min-h-[340px]">
      {inView ? (
        <Shelf
          title={shelf.title}
          subtitle={shelf.blurb}
          query={q}
          shape="book"
          gap="gap-8"
          render={(b) => <BookCard key={b.externalId} rail shelf item={b} />}
        />
      ) : (
        <>
          <SectionHeader title={shelf.title} subtitle={shelf.blurb} />
          <RowSkeleton shape="book" />
        </>
      )}
    </div>
  )
}
