import { CATEGORIES, STATUS } from '../config/categories'
import { toStars } from './rating'

// Rough time invested in one library row, from cached metadata. Completed
// items count in full; in-progress items count what's been done so far.
export function estimateMinutes(row) {
  const m = row.metadata || {}
  const p = row.progress || {}
  const done = row.status === STATUS.COMPLETED
  switch (row.category) {
    case 'movie':
    case 'documentary':
      return done ? m.runtime || 110 : 0
    case 'tv': {
      const run = m.runtime || m.episode_run_time?.[0] || 42
      const total = m.episodes || m.number_of_episodes || 20
      const watched = done ? total : episodesWatched(p, m.seasonEpisodes, total, m.seasons)
      return watched * run
    }
    case 'anime': {
      const run = m.runtime || 24
      const watched = done ? m.episodes || 12 : p.episode || 0
      return watched * run
    }
    case 'book': {
      const pages = done ? m.pageCount || m.volumeInfo?.pageCount || 320 : p.page || 0
      return pages * 1.5
    }
    case 'game':
      return (p.hours ?? (done ? m.playtime || 12 : 0)) * 60
    case 'youtube':
      return done ? m.runtime || 35 : 0
    default:
      return 0
  }
}

function episodesWatched(p, seasonEpisodes, total, seasons) {
  if (!p?.season) return 0
  const per = total && seasons ? Math.round(total / seasons) : 10
  let n = 0
  for (let s = 1; s < p.season; s++) n += seasonEpisodes?.[s - 1] ?? per
  return n + (p.episode || 0)
}

const day = (iso) => (iso ? String(iso).slice(0, 10) : null)
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Consecutive days (ending today or yesterday) with any library activity.
export function activityStreak(rows) {
  const days = new Set()
  for (const r of rows) {
    for (const t of [r.updated_at, r.added_at, r.completed_at]) {
      if (t) days.add(ymd(new Date(t)))
    }
  }
  const d = new Date()
  if (!days.has(ymd(d))) d.setDate(d.getDate() - 1)
  let streak = 0
  while (days.has(ymd(d))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

export function computeStats(rows) {
  const year = new Date().getFullYear()
  const byCategory = Object.fromEntries(
    CATEGORIES.map((c) => [
      c.key,
      { total: 0, completed: 0, inProgress: 0, planned: 0, minutes: 0, ratingSum: 0, ratingCount: 0, avgRating: null, thisYear: 0, favorites: 0 },
    ]),
  )
  let completed = 0
  let inProgress = 0
  let planned = 0
  let minutes = 0
  let thisYear = 0
  const ratingHistogram = Array(10).fill(0) // 0.5★ … 5★
  const byMonth = new Map() // "2026-09" -> completions

  for (const r of rows) {
    const b = byCategory[r.category]
    if (!b) continue
    b.total++
    const mins = estimateMinutes(r)
    b.minutes += mins
    minutes += mins
    if (r.favorite) b.favorites++
    if (r.status === STATUS.COMPLETED) {
      b.completed++
      completed++
      const when = day(r.completed_at || r.updated_at)
      if (when?.startsWith(String(year))) {
        b.thisYear++
        thisYear++
      }
      if (when) byMonth.set(when.slice(0, 7), (byMonth.get(when.slice(0, 7)) || 0) + 1)
    } else if (r.status === STATUS.IN_PROGRESS) {
      b.inProgress++
      inProgress++
    } else if (r.status === STATUS.WISHLIST) {
      b.planned++
      planned++
    }
    if (r.user_rating != null) {
      const s = toStars(r.user_rating)
      b.ratingSum += s
      b.ratingCount++
      ratingHistogram[Math.round(s * 2) - 1]++
    }
  }
  for (const b of Object.values(byCategory)) b.avgRating = b.ratingCount ? b.ratingSum / b.ratingCount : null

  return {
    total: rows.length,
    completed,
    inProgress,
    planned,
    thisYear,
    hours: Math.round(minutes / 60),
    byCategory,
    ratingHistogram,
    byMonth,
    streak: activityStreak(rows),
  }
}

// Top genres across rows (names), for "your taste" summaries.
export function topGenreNames(rows, labelFor, limit = 6) {
  const counts = new Map()
  for (const r of rows) {
    for (const g of labelFor(r)) counts.set(g, (counts.get(g) || 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)
}
