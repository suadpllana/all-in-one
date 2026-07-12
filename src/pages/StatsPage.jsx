import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES, STATUS } from '../config/categories'
import { useLibrary } from '../hooks/useLibrary'
import { toStars } from '../lib/rating'

// Cross-category "My Stats" dashboard.
export default function StatsPage() {
  const { items, isLoading } = useLibrary()

  const stats = useMemo(() => computeStats(items), [items])

  return (
    <div className="page-in space-y-8">
      <div>
        <h1 className="text-gradient-accent w-fit text-3xl font-black tracking-tight">
          My Stats
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Everything you’ve tracked, across every category.
        </p>
      </div>

      {isLoading ? (
        <p className="text-[var(--color-muted)]">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] p-12 text-center">
          <p className="text-lg font-semibold">Nothing tracked yet</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Add movies, shows, books, games and more to see your stats fill in.
          </p>
          <Link
            to="/movies"
            className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Start browsing
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatTile label="Items tracked" value={items.length} />
            <StatTile label="Completed" value={stats.completed} />
            <StatTile label="In progress" value={stats.inProgress} />
            <StatTile label="Hours logged" value={`${stats.hours.toLocaleString()}h`} />
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold">By category</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CATEGORIES.map((c) => {
                const s = stats.byCategory[c.key]
                return (
                  <Link
                    key={c.key}
                    to={c.route}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-muted)]"
                    style={{ borderLeft: `3px solid ${c.accent}` }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 font-semibold">
                        <span>{c.icon}</span> {c.label}
                      </span>
                      <span className="text-2xl font-black" style={{ color: c.accent }}>
                        {s.total}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-4 text-xs text-[var(--color-muted)]">
                      <span>{s.completed} {c.verbs.done.toLowerCase()}</span>
                      {/* Categories without an in-progress state (movies)
                          skip the "watching" line. */}
                      {!c.noProgress && (
                        <span>{s.inProgress} {c.verbs.progress.toLowerCase()}</span>
                      )}
                      <span>{s.planned} {c.verbs.plan.toLowerCase()}</span>
                    </div>
                    {s.avgRating != null && (
                      <p className="mt-2 text-xs" style={{ color: c.accent }}>
                        ★ {s.avgRating.toFixed(1)}/5 avg your rating
                      </p>
                    )}
                  </Link>
                )
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function StatTile({ label, value }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <p className="text-3xl font-black text-accent">{value}</p>
      <p className="mt-1 text-sm text-[var(--color-muted)]">{label}</p>
    </div>
  )
}

function computeStats(items) {
  const byCategory = Object.fromEntries(
    CATEGORIES.map((c) => [
      c.key,
      { total: 0, completed: 0, inProgress: 0, planned: 0, ratingSum: 0, ratingCount: 0, avgRating: null },
    ]),
  )
  let completed = 0
  let inProgress = 0
  let minutes = 0

  for (const it of items) {
    const b = byCategory[it.category]
    if (!b) continue
    b.total += 1
    if (it.status === STATUS.COMPLETED) {
      b.completed += 1
      completed += 1
      minutes += estimateMinutes(it)
    } else if (it.status === STATUS.IN_PROGRESS) {
      b.inProgress += 1
      inProgress += 1
    } else if (it.status === STATUS.WISHLIST) {
      b.planned += 1
    }
    if (it.user_rating != null) {
      // toStars normalizes ratings saved on the old 1-10 scale to 1-5 stars.
      b.ratingSum += toStars(it.user_rating)
      b.ratingCount += 1
    }
  }

  for (const b of Object.values(byCategory)) {
    b.avgRating = b.ratingCount ? b.ratingSum / b.ratingCount : null
  }

  return { completed, inProgress, hours: Math.round(minutes / 60), byCategory }
}

// Rough time-invested estimate per completed item from cached metadata.
// Reads the slim shape (see lib/rowToItem itemToMetadata) first, falling back
// to the legacy full-raw-payload keys for rows saved before it existed.
function estimateMinutes(it) {
  const m = it.metadata || {}
  switch (it.category) {
    case 'movie':
    case 'documentary':
      return m.runtime || 115
    case 'tv': {
      const eps = m.episodes || m.number_of_episodes || 20
      const run = m.runtime || (m.episode_run_time && m.episode_run_time[0]) || 42
      return eps * run
    }
    case 'anime': {
      const eps = m.episodes || 12
      return eps * 24
    }
    case 'book': {
      const pages = m.pageCount || m.volumeInfo?.pageCount || 320
      return pages * 1.5 // ~1.5 min/page
    }
    case 'game':
      return (m.playtime || 12) * 60
    case 'youtube': {
      if (m.runtime) return m.runtime
      // Legacy rows: contentDetails.duration when added from the detail page.
      const d = m.contentDetails?.duration
      const parsed = d && /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(d)
      if (parsed) return Math.round(+(parsed[1] || 0) * 60 + +(parsed[2] || 0) + +(parsed[3] || 0) / 60)
      return 35 // long-form default
    }
    default:
      return 60
  }
}
