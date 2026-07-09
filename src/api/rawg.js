import { fetchJson, requireKey } from './http'

// RAWG — largest free games database. Requires an API key.
const KEY = import.meta.env.VITE_RAWG_API_KEY
const BASE = 'https://api.rawg.io/api'

function url(path, params = {}) {
  requireKey(KEY, 'RAWG')
  const q = new URLSearchParams({ key: KEY, page_size: '20', ...params })
  return `${BASE}${path}?${q}`
}

const isoDaysAgo = (days) => {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}
const today = () => new Date().toISOString().slice(0, 10)

function normalize(g) {
  return {
    category: 'game',
    externalId: String(g.id),
    title: g.name || 'Untitled',
    posterUrl: g.background_image || null,
    backdropUrl: g.background_image || null,
    year: g.released ? Number(String(g.released).slice(0, 4)) : null,
    // RAWG `rating` is 0-5; prefer metacritic (0-100) when present.
    rating:
      typeof g.metacritic === 'number'
        ? g.metacritic / 10
        : typeof g.rating === 'number'
          ? g.rating * 2
          : null,
    overview: g.description_raw || '',
    genreIds: (g.genres || []).map((x) => x.slug),
    raw: g,
  }
}

const mapList = (data) =>
  (data.results || []).filter((g) => g.background_image).map(normalize)

export const rawg = {
  trending: (signal) =>
    fetchJson(
      url('/games', { dates: `${isoDaysAgo(90)},${today()}`, ordering: '-added' }),
      { signal },
    ).then(mapList),
  topRated: (signal) =>
    fetchJson(url('/games', { ordering: '-metacritic', metacritic: '85,100' }), { signal }).then(
      mapList,
    ),
  newReleases: (signal) =>
    fetchJson(
      url('/games', { dates: `${isoDaysAgo(120)},${today()}`, ordering: '-released' }),
      { signal },
    ).then(mapList),
  search: (query, signal) =>
    fetchJson(url('/games', { search: query, search_precise: 'true' }), { signal }).then(mapList),
  byGenres: (genres, signal) =>
    fetchJson(url('/games', { genres: genres.join(','), ordering: '-added' }), { signal }).then(
      mapList,
    ),
  async detail(id, signal) {
    const g = await fetchJson(url(`/games/${id}`), { signal })
    const base = normalize(g)
    return {
      ...base,
      genres: (g.genres || []).map((x) => x.name),
      playtime: g.playtime || null, // average hours
      platforms: (g.platforms || []).map((p) => p.platform.name).slice(0, 6),
      people: (g.developers || []).map((d) => d.name).slice(0, 4),
      creators: (g.developers || []).map((d) => d.name).slice(0, 3),
      publisher: (g.publishers || [])[0]?.name || '',
      tagline: '',
    }
  },
}
