// Per-world progress tracking. A library row's `progress` is:
//   tv    { season, episode }   last episode watched (sequential)
//   anime { episode }
//   book  { page }
//   game  { hours }             hours played (vs. the average time to beat)
// Totals come from cached metadata (episodes, seasonEpisodes, pageCount,
// playtime) and may be unknown — every helper degrades to counts only.

const sum = (arr) => (Array.isArray(arr) ? arr.reduce((a, b) => a + (b || 0), 0) : 0)
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

// Episodes watched before + including (season, episode).
export function tvWatchedCount(progress, seasonEpisodes, perSeasonFallback = 10) {
  if (!progress?.season) return 0
  let n = 0
  for (let s = 1; s < progress.season; s++) n += seasonEpisodes?.[s - 1] ?? perSeasonFallback
  return n + (progress.episode || 0)
}

function tvTotals(item) {
  const total = item.episodes || sum(item.seasonEpisodes) || null
  const perSeason = total && item.seasons ? Math.max(1, Math.round(total / item.seasons)) : 10
  return { total, perSeason }
}

// { current, total, pct, label, detail } for display, or null for worlds
// without progress tracking.
export function getProgress(item) {
  const p = item._progress || {}
  switch (item.category) {
    case 'tv': {
      const { total, perSeason } = tvTotals(item)
      const current = tvWatchedCount(p, item.seasonEpisodes, perSeason)
      return {
        current,
        total,
        pct: total ? current / total : null,
        label: !p.season ? 'Not started' : p.episode ? `S${p.season} · E${p.episode}` : `Starting S${p.season}`,
        detail: total ? `${current} of ${total} episodes` : `${current} episodes`,
        next: nextEpisodeLabel(item),
      }
    }
    case 'anime': {
      const current = p.episode || 0
      const total = item.episodes || null
      return {
        current,
        total,
        pct: total ? current / total : null,
        label: `Ep ${current}${total ? ` / ${total}` : ''}`,
        detail: total ? `${current} of ${total} episodes` : `${current} episodes`,
      }
    }
    case 'book': {
      const current = p.page || 0
      const total = item.pageCount || null
      const left = total ? Math.max(0, total - current) : null
      return {
        current,
        total,
        pct: total ? current / total : null,
        label: total ? `${Math.round((current / total) * 100)}%` : `p. ${current}`,
        detail: total ? `Page ${current} of ${total}` : `Page ${current}`,
        left: left != null ? readingTime(left) : null,
      }
    }
    case 'game': {
      const current = p.hours || 0
      const total = item.playtime || null
      return {
        current,
        total,
        pct: total ? Math.min(1, current / total) : null,
        label: `${formatHours(current)} played`,
        detail: total ? `${formatHours(current)} of ~${total}h to beat` : `${formatHours(current)} played`,
      }
    }
    default:
      return null
  }
}

// Progress after a "+step" (episodes, pages or hours). TV rolls over into
// the next season when the current one is known to be finished.
export function stepProgress(item, step = 1) {
  const p = item._progress || {}
  switch (item.category) {
    case 'tv': {
      let season = p.season || 1
      let episode = (p.episode || 0) + step
      const inSeason = item.seasonEpisodes?.[season - 1]
      if (step > 0 && inSeason && episode > inSeason && item.seasonEpisodes[season] != null) {
        season += 1
        episode = 1
      }
      // Stepping back past E1 returns to the end of the previous season.
      if (step < 0 && episode < 1 && season > 1 && item.seasonEpisodes?.[season - 2] != null) {
        season -= 1
        episode = item.seasonEpisodes[season - 1]
      }
      if (episode < 0) episode = 0
      return { season, episode }
    }
    case 'anime':
      return { episode: clamp((p.episode || 0) + step, 0, item.episodes || Infinity) }
    case 'book':
      return { page: clamp((p.page || 0) + step, 0, item.pageCount || Infinity) }
    case 'game':
      return { hours: Math.max(0, Math.round(((p.hours || 0) + step) * 10) / 10) }
    default:
      return null
  }
}

// Has this progress reached the end (so the item can be marked complete)?
export function isFinished(item, progress) {
  if (!progress) return false
  switch (item.category) {
    case 'tv': {
      // A returning series you've caught up on isn't "finished".
      if (item.inProduction) return false
      const { total, perSeason } = tvTotals(item)
      return Boolean(total) && tvWatchedCount(progress, item.seasonEpisodes, perSeason) >= total
    }
    case 'anime':
      return Boolean(item.episodes) && progress.episode >= item.episodes
    case 'book':
      return Boolean(item.pageCount) && progress.page >= item.pageCount
    default:
      return false
  }
}

export function nextEpisodeLabel(item) {
  const next = stepProgress(item, 1)
  return next ? `S${next.season} · E${next.episode}` : null
}

// Label for the "+1" action (callers add the plus icon).
export function stepLabel(category) {
  return { tv: '1 ep', anime: '1 ep', book: '10 pages', game: '1 hour' }[category] || '1'
}

export function stepSize(category) {
  return category === 'book' ? 10 : 1
}

// ~1.5 minutes per page.
export function readingTime(pages) {
  const min = Math.round(pages * 1.5)
  if (min < 60) return `${min}m left`
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}h${m ? ` ${m}m` : ''} left`
}

export function formatHours(h) {
  if (!h) return '0h'
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`
}
