// Human-readable "time cost" for a card, derived per category from the slim
// metadata cache (see lib/rowToItem itemToMetadata).
//
// Note: the API list endpoints don't carry runtime — TMDB only returns it on
// the detail payload — so discover rows show nothing until an item has been
// opened or saved. Returning null (rather than a guess) keeps the card honest;
// the StatsPage per-category averages are fine for aggregates but would be
// misleading stamped on an individual poster.

// 122 -> "2h 2m", 45 -> "45m", 120 -> "2h"
export function formatMinutes(min) {
  if (!min || min <= 0) return null
  const total = Math.round(min)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (!h) return `${m}m`
  if (!m) return `${h}h`
  return `${h}h ${m}m`
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

// Reads both the slim metadata shape and the legacy full-raw-payload keys, so
// rows saved before the slim cache existed still render.
export function durationLabel(item) {
  if (!item) return null
  const m = item.raw || {}
  const runtime = item.runtime ?? m.runtime ?? m.episode_run_time?.[0] ?? null
  const episodes = item.episodes ?? m.episodes ?? m.number_of_episodes ?? null
  const seasons = item.seasons ?? m.seasons ?? m.number_of_seasons ?? null
  const pageCount = item.pageCount ?? m.pageCount ?? m.volumeInfo?.pageCount ?? null
  const playtime = item.playtime ?? m.playtime ?? null

  switch (item.category) {
    case 'movie':
    case 'documentary':
    case 'youtube':
      return formatMinutes(runtime)

    // Series read better as their shape (how much is there) than as a total
    // runtime, which would be a multi-hundred-hour number nobody scans.
    case 'tv':
    case 'anime': {
      if (episodes) return plural(episodes, 'ep')
      if (seasons) return plural(seasons, 'season')
      return formatMinutes(runtime)
    }

    case 'book':
      return pageCount ? plural(pageCount, 'page') : null

    case 'game':
      return playtime ? `~${plural(playtime, 'hr')}` : null

    default:
      return formatMinutes(runtime)
  }
}
