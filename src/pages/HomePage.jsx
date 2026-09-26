import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES, STATUS } from '../config/categories'
import { useLibrary } from '../hooks/useLibrary'
import { useDocumentTitle, useTheme } from '../hooks/useTheme'
import { cn } from '../lib/cn'
import { greeting } from '../lib/format'
import { rowToItem } from '../lib/rowToItem'
import { computeStats } from '../lib/stats'
import ContinueCard from '../components/cards/ContinueCard'
import MediaCard from '../components/cards/MediaCard'
import Icon from '../components/ui/Icon'
import Rail from '../components/ui/Rail'
import { SectionHeader } from '../components/ui/Section'

const openSearch = () => window.dispatchEvent(new Event('vault:search'))
const byDesc = (key) => (a, b) => (b[key] || '').localeCompare(a[key] || '')

// Home: your whole vault at a glance — what you're in the middle of, a
// portal into each world (rendered in that world's own look), and what you
// saved or finished lately.
export default function HomePage() {
  useTheme('home')
  useDocumentTitle('Home')
  const { items } = useLibrary()
  const stats = useMemo(() => computeStats(items), [items])
  const rows = useMemo(() => items.map(rowToItem), [items])

  const continuing = rows.filter((i) => i._status === STATUS.IN_PROGRESS).sort(byDesc('_updatedAt'))
  const saved = rows.filter((i) => i._status === STATUS.WISHLIST).sort(byDesc('_addedAt')).slice(0, 18)
  const finished = rows.filter((i) => i._status === STATUS.COMPLETED).sort(byDesc('_completedAt')).slice(0, 18)

  return (
    <div className="page-in">
      <Welcome stats={stats} />
      <div className="shell space-y-16">
        {continuing.length > 0 && (
          <section className="rise">
            <SectionHeader kicker="Pick up where you left off" title="Continue" count={continuing.length} />
            <Rail label="Continue">
              {continuing.map((i) => (
                <ContinueCard key={`${i.category}:${i.externalId}`} item={i} />
              ))}
            </Rail>
          </section>
        )}

        <Portals rows={rows} stats={stats} />

        {saved.length > 0 && (
          <section className="rise">
            <SectionHeader kicker="Saved for later" title="Up Next" subtitle="The newest additions to your lists, across every world" />
            <Rail label="Up next" className="items-start">
              {saved.map((i) => (
                <MediaCard key={`${i.category}:${i.externalId}`} item={i} accent rail size="sm" />
              ))}
            </Rail>
          </section>
        )}

        {finished.length > 0 && (
          <section className="rise">
            <SectionHeader kicker="Your log" title="Recently Finished" to="/stats" />
            <Rail label="Recently finished" className="items-start">
              {finished.map((i) => (
                <MediaCard key={`${i.category}:${i.externalId}`} item={i} accent rail size="sm" />
              ))}
            </Rail>
          </section>
        )}
      </div>
    </div>
  )
}

function Welcome({ stats }) {
  const empty = stats.total === 0
  const today = new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })
  const line = empty
    ? 'Everything you watch, read and play — in one vault. Pick a world below to start filling it.'
    : [
        stats.inProgress ? `You’re in the middle of ${stats.inProgress} thing${stats.inProgress === 1 ? '' : 's'}` : 'Nothing in progress',
        stats.planned ? `with ${stats.planned} saved for later` : null,
      ]
        .filter(Boolean)
        .join(', ') + (stats.thisYear ? `. ${stats.thisYear} finished this year.` : '.')

  return (
    <section className="under-top relative overflow-hidden pb-12 pt-24 md:pb-16 md:pt-32">
      {/* Every world's colour, softly blended. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-60">
        {CATEGORIES.map((c, i) => (
          <span
            key={c.key}
            className="absolute h-[42vw] max-h-[520px] w-[42vw] max-w-[520px] rounded-full blur-[120px]"
            style={{
              background: c.accent,
              opacity: 0.22,
              left: `${(i * 15) % 90 - 10}%`,
              top: `${i % 2 ? -30 : -10}%`,
            }}
          />
        ))}
      </div>
      <div className="shell">
        <p className="kicker text-muted">{today}</p>
        <h1 className="mt-3 text-5xl font-extrabold tracking-[-0.045em] text-fg md:text-7xl">
          {greeting()}
          <span className="text-gradient">.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-fg-2 md:text-xl">{line}</p>

        {!empty && (
          <div className="mt-7 flex flex-wrap gap-2.5">
            {stats.streak > 0 && <Pill icon="flame" tone="text-orange-400">{stats.streak}-day streak</Pill>}
            <Pill icon="check">{stats.completed} finished</Pill>
            <Pill icon="clock">{stats.hours.toLocaleString()} hours logged</Pill>
            <Pill icon="bookmark">{stats.planned} on your lists</Pill>
          </div>
        )}

        <button
          type="button"
          onClick={openSearch}
          className="group mt-8 flex h-14 w-full max-w-xl items-center gap-3 rounded-2xl bg-surface/80 px-5 text-left text-muted shadow-[0_20px_50px_-25px_rgba(0,0,0,.8)] ring-1 ring-line backdrop-blur transition-all hover:ring-accent-line"
        >
          <Icon name="search" className="h-5 w-5 text-accent" />
          <span className="flex-1 truncate">Search films, shows, anime, books, games…</span>
          <kbd className="hidden rounded-md bg-surface-2 px-2 py-1 text-xs font-semibold ring-1 ring-line sm:block">/</kbd>
        </button>
      </div>
    </section>
  )
}

function Pill({ icon, tone = 'text-accent', children }) {
  return (
    <span className="flex h-9 items-center gap-2 rounded-full bg-surface/80 px-3.5 text-sm font-semibold text-fg ring-1 ring-line backdrop-blur">
      <Icon name={icon} className={cn('h-4 w-4', tone)} strokeWidth={2.2} />
      {children}
    </span>
  )
}

/* --------------------------------------------------------------- portals */

const LAYOUT = {
  movie: 'md:col-span-2 md:row-span-2',
  tv: '',
  anime: '',
  book: 'md:col-span-2',
  game: '',
  documentary: '',
  youtube: 'md:col-span-2',
}

// Worlds that take a single column (half-width on phones).
const SMALL = new Set(['tv', 'anime', 'game', 'documentary'])

function Portals({ rows, stats }) {
  return (
    <section className="rise">
      <SectionHeader kicker="Seven worlds, one vault" title="Your Worlds" />
      <div className="grid auto-rows-[190px] grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {CATEGORIES.map((c) => (
          <Portal key={c.key} category={c} s={stats.byCategory[c.key]} art={rows.filter((r) => r.category === c.key && r.posterUrl).slice(0, 3)} />
        ))}
      </div>
    </section>
  )
}

function Portal({ category: c, s, art }) {
  const big = c.key === 'movie'
  const small = SMALL.has(c.key)
  const wide = c.shape === 'wide' || c.shape === 'video'
  const line = s.total
    ? [
        s.completed ? `${s.completed} ${c.verbs.done.toLowerCase()}` : null,
        s.inProgress ? `${s.inProgress} ${c.verbs.progress.toLowerCase()}` : null,
        s.planned ? `${s.planned} ${c.key === 'book' ? 'to read' : 'saved'}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Start exploring'
  // Half-width phone tiles get one figure — what you're in the middle of,
  // else what's waiting, else what's done.
  const brief = s.inProgress
    ? `${s.inProgress} ${c.verbs.progress.toLowerCase()}`
    : s.planned
      ? `${s.planned} saved`
      : s.completed
        ? `${s.completed} ${c.verbs.done.toLowerCase()}`
        : 'Start exploring'

  return (
    <Link
      to={c.route}
      data-theme={c.key}
      className={cn(
        'group relative isolate overflow-hidden rounded-3xl bg-bg p-5 text-fg ring-1 ring-line transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_var(--accent)] md:p-6',
        small ? 'col-span-1' : 'col-span-2',
        LAYOUT[c.key],
      )}
    >
      <div className="texture" />
      <div
        className="absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-40 blur-3xl transition-opacity duration-500 group-hover:opacity-70"
        style={{ background: 'var(--accent)' }}
      />
      {/* A fan of artwork from your own shelf. */}
      {art.length > 0 ? (
        <div className={cn('absolute right-3 top-3 flex', big ? 'md:right-8 md:top-8' : '')}>
          {art.map((a, i) => (
            <img
              key={a.externalId}
              src={wide ? a.backdropUrl || a.posterUrl : a.posterUrl}
              alt=""
              loading="lazy"
              className={cn(
                'rounded-card object-cover shadow-2xl ring-1 ring-white/10 transition-transform duration-500',
                wide ? 'aspect-video w-20 md:w-24' : 'aspect-[2/3] w-11 md:w-12',
                big && !wide && 'md:w-24',
                i > 0 && '-ml-6',
                i === 0 && '-rotate-6 group-hover:-rotate-12',
                i === 1 && 'translate-y-2 group-hover:translate-y-0',
                i === 2 && 'rotate-6 group-hover:rotate-12',
              )}
              style={{ zIndex: 3 - i }}
            />
          ))}
        </div>
      ) : (
        <Icon
          name={c.icon}
          className={cn('absolute right-4 top-4 text-accent opacity-80 transition-transform duration-500 group-hover:scale-110', big ? 'h-20 w-20' : 'h-12 w-12')}
          strokeWidth={1.4}
        />
      )}
      <div className="absolute inset-x-5 bottom-5 md:inset-x-6 md:bottom-6">
        <p className={cn('display text-fg', big ? 'text-5xl md:text-7xl' : 'text-[1.7rem] leading-none md:text-[2rem]')}>
          {small ? (
            <>
              <span className="sm:hidden">{c.short}</span>
              <span className="hidden sm:inline">{c.label}</span>
            </>
          ) : (
            c.label
          )}
        </p>
        <p className={cn('mt-2 text-sm text-fg-2', !big && 'hidden sm:block')}>{c.tagline}</p>
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent">
          {small ? (
            <>
              <span className="sm:hidden">{brief}</span>
              <span className="hidden sm:inline">{line}</span>
            </>
          ) : (
            line
          )}
          <Icon name="arrowRight" className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-1" />
        </p>
      </div>
    </Link>
  )
}
