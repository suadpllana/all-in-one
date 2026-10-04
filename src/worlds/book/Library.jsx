import { useState } from 'react'
import { Link } from 'react-router-dom'
import { STATUS } from '../../config/categories'
import { useItemActions } from '../../hooks/useItemActions'
import { cn } from '../../lib/cn'
import { formatDate, toDate } from '../../lib/format'
import { gridClass } from '../../lib/grid'
import { detailPath } from '../../lib/paths'
import { toStars } from '../../lib/rating'
import BookCard from '../../components/cards/BookCard'
import { NoteSlot } from '../../components/library/NoteEditor'
import ProgressControl from '../../components/library/ProgressControl'
import StatusMenu from '../../components/library/StatusMenu'
import { Button } from '../../components/ui/Button'
import { GridSkeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/States'
import { useLibraryItems } from '../shared/library'
import LibraryToolbar, { Summary } from '../shared/LibraryToolbar'
import PickForMe from '../shared/PickForMe'
import { AuthorLine, Book3D, ReadingChallenge } from './parts'

export default function BookLibrary({ category, tab, query }) {
  return (
    <div className="shell page-in py-8 md:py-12">
      {tab.key === 'progress' ? (
        <Reading category={category} query={query} />
      ) : tab.key === 'done' ? (
        <ReadLog category={category} query={query} />
      ) : (
        <WantToRead category={category} query={query} />
      )}
    </div>
  )
}

function Header({ kicker, title, children }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="kicker text-accent">{kicker}</p>
        <h1 className="mt-2 font-display text-5xl text-fg md:text-6xl">{title}</h1>
      </div>
      {children}
    </header>
  )
}

const hours = (pages) => Math.round((pages * 1.5) / 60)

function Empty({ category, title, hint }) {
  return (
    <EmptyState icon="book" title={title} hint={hint}>
      <Button as={Link} to={category.route} variant="primary" icon="book">
        Browse the shelves
      </Button>
    </EmptyState>
  )
}

/* -------------------------------------------------------- want to read */

function WantToRead({ category, query }) {
  const [sort, setSort] = useState('recent')
  const { all, items, isLoading } = useLibraryItems('book', STATUS.WISHLIST, query, sort)
  const pages = all.reduce((n, b) => n + (b.pageCount || 0), 0)
  return (
    <>
      <Header kicker="Your to-be-read pile" title="Want to Read">
        <PickForMe
          items={all}
          label="Choose my next read"
          heading="Your next read"
          describe={(b) => [b.authors?.[0], b.pageCount ? `${b.pageCount} pages` : null].filter(Boolean).join(' · ')}
        />
      </Header>
      {isLoading ? (
        <GridSkeleton shape="book" />
      ) : !all.length ? (
        <Empty category={category} title="Your pile is empty" hint="Save books you want to read — they’ll line up on your shelf here." />
      ) : (
        <>
          <LibraryToolbar
            summary={
              <Summary
                stats={[
                  { label: 'Books', value: all.length },
                  pages ? { label: 'Pages', value: pages.toLocaleString() } : null,
                  pages ? { label: 'Reading time', value: `~${hours(pages)}h` } : null,
                ]}
              />
            }
            sorts={['recent', 'pages', 'rating', 'newest', 'oldest', 'az']}
            sort={sort}
            onSort={setSort}
          />
          <div className={cn(gridClass('book'), 'mt-10 gap-x-8')}>
            {items.map((b) => (
              <BookCard key={b.externalId} item={b} size="fill" shelf />
            ))}
          </div>
        </>
      )}
    </>
  )
}

/* ------------------------------------------------------------- reading */

function Reading({ category, query }) {
  const { all, items, isLoading } = useLibraryItems('book', STATUS.IN_PROGRESS, query, 'progress')
  return (
    <>
      <Header kicker="On your nightstand" title="Currently Reading" />
      {isLoading ? (
        <GridSkeleton shape="wide" count={2} />
      ) : !all.length ? (
        <Empty category={category} title="Not reading anything" hint="Start a book and log pages as you go — you’ll always know how much is left." />
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {items.map((b) => (
            <ReadingDesk key={b.externalId} item={b} />
          ))}
        </div>
      )}
    </>
  )
}

function ReadingDesk({ item }) {
  const a = useItemActions(item)
  return (
    <article className="paper grid grid-cols-1 gap-6 rounded-3xl p-6 ring-1 ring-line sm:grid-cols-[132px_1fr]">
      <Link to={detailPath(item)} className="mx-auto w-28 sm:mx-0 sm:w-full">
        <Book3D item={item} />
      </Link>
      <div className="min-w-0">
        <Link to={detailPath(item)} className="font-display text-2xl leading-tight text-fg hover:text-accent">
          {item.title}
        </Link>
        <AuthorLine authors={item.authors} className="mt-1" />
        {item._startedAt && <p className="mt-1 text-xs text-muted">Started {formatDate(item._startedAt)}</p>}
        <ProgressControl item={item} title="Where you are" className="mt-4 bg-bg-elev" />
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="primary" icon="check" onClick={() => a.setStatus(STATUS.COMPLETED)}>
            Finished it
          </Button>
          <StatusMenu item={item} className="ml-auto" />
        </div>
      </div>
    </article>
  )
}

/* ---------------------------------------------------------------- read */

// A finished book on the shelf, with your note on it underneath.
function ReadBook({ item }) {
  return (
    <div>
      <BookCard item={item} size="fill" shelf />
      <NoteSlot item={item} compact className="mt-2" />
    </div>
  )
}

function ReadLog({ category, query }) {
  const [sort, setSort] = useState('recent')
  const { all, items, isLoading } = useLibraryItems('book', STATUS.COMPLETED, query, sort)
  const year = new Date().getFullYear()
  const readThisYear = all.filter((b) => toDate(b._completedAt)?.getFullYear() === year).length
  const pages = all.reduce((n, b) => n + (b.pageCount || 0), 0)
  const rated = all.filter((b) => b._userRating != null)
  const avg = rated.length ? rated.reduce((n, b) => n + toStars(b._userRating), 0) / rated.length : null

  // Group by the year you finished them.
  const years = []
  for (const b of items) {
    const y = toDate(b._completedAt || b._updatedAt)?.getFullYear() || 'Earlier'
    let g = years.find((x) => x.year === y)
    if (!g) years.push((g = { year: y, items: [] }))
    g.items.push(b)
  }
  if (sort === 'recent') years.sort((a, b) => (b.year === 'Earlier' ? -1 : a.year === 'Earlier' ? 1 : b.year - a.year))

  return (
    <>
      <Header kicker="Your reading life" title="Books Read" />
      {isLoading ? (
        <GridSkeleton shape="book" />
      ) : !all.length ? (
        <Empty category={category} title="No finished books yet" hint="Mark a book as read and it joins your shelf — with the year you finished it." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_auto]">
            <LibraryToolbar
              summary={
                <Summary
                  stats={[
                    { label: 'Books', value: all.length },
                    pages ? { label: 'Pages', value: pages.toLocaleString() } : null,
                    avg != null ? { label: 'Avg rating', value: `${avg.toFixed(1)}★` } : null,
                  ]}
                />
              }
              sorts={['recent', 'myRating', 'pages', 'az']}
              sort={sort}
              onSort={setSort}
            />
            <ReadingChallenge readThisYear={readThisYear} compact className="lg:w-96" />
          </div>
          {sort === 'recent' ? (
            years.map((g) => (
              <section key={g.year} className="mt-12">
                <h2 className="flex items-baseline gap-3 border-b border-line pb-3">
                  <span className="font-display text-4xl text-fg">{g.year}</span>
                  <span className="text-sm text-muted">
                    {g.items.length} book{g.items.length === 1 ? '' : 's'}
                  </span>
                </h2>
                <div className={cn(gridClass('book'), 'mt-8 gap-x-8')}>
                  {g.items.map((b) => (
                    <ReadBook key={b.externalId} item={b} />
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className={cn(gridClass('book'), 'mt-10 gap-x-8')}>
              {items.map((b) => (
                <ReadBook key={b.externalId} item={b} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}
