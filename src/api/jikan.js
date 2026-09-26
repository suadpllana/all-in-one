import { fetchJson } from './http'

// Jikan v4 — unofficial MyAnimeList API, no key. Fallback source for anime
// when AniList is unreachable. Rate limited (~3 req/s), so requests are
// spaced out through a tiny queue.
const BASE = 'https://api.jikan.moe/v4'

let last = 0
function queued(url, signal) {
  const wait = Math.max(0, last + 400 - Date.now())
  last = Date.now() + wait
  return new Promise((resolve) => setTimeout(resolve, wait)).then(() => fetchJson(url, { signal }))
}

const FORMAT = { TV: 'TV', Movie: 'MOVIE', OVA: 'OVA', ONA: 'ONA', Special: 'SPECIAL', Music: 'MUSIC' }

function normalize(a) {
  return {
    category: 'anime',
    externalId: String(a.mal_id),
    malId: a.mal_id,
    title: a.title_english || a.title || 'Untitled',
    titleRomaji: a.title || null,
    titleNative: a.title_japanese || null,
    posterUrl: a.images?.webp?.large_image_url || a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || null,
    // MAL has no wide banner art.
    backdropUrl: null,
    year: a.year || (a.aired?.prop?.from?.year ?? null),
    rating: typeof a.score === 'number' ? a.score : null,
    popularity: a.members ?? null,
    overview: (a.synopsis || '').replace(/\[Written by MAL Rewrite\]\s*$/, '').trim(),
    genreIds: (a.genres || []).map((g) => g.name),
    episodes: a.episodes || null,
    runtime: a.duration ? parseInt(a.duration, 10) || null : null,
    format: FORMAT[a.type] || a.type || null,
    airingStatus: a.airing ? 'RELEASING' : a.status === 'Not yet aired' ? 'NOT_YET_RELEASED' : 'FINISHED',
    season: a.season ? a.season.toUpperCase() : null,
    studios: (a.studios || []).map((s) => s.name),
    nextAiring: null,
    raw: { genres: (a.genres || []).map((g) => g.name) },
  }
}

const mapList = (data) => {
  const seen = new Set()
  return (data.data || [])
    .filter((a) => a.images?.jpg?.image_url && !seen.has(a.mal_id) && seen.add(a.mal_id))
    .map(normalize)
}

export const jikan = {
  trending: (signal) => queued(`${BASE}/top/anime?filter=airing&limit=20`, signal).then(mapList),
  topRated: (signal) => queued(`${BASE}/top/anime?limit=20`, signal).then(mapList),
  popular: (signal) => queued(`${BASE}/top/anime?filter=bypopularity&limit=20`, signal).then(mapList),
  newReleases: (signal) => queued(`${BASE}/seasons/now?limit=24`, signal).then(mapList),
  season: ({ season, year }, signal) =>
    queued(`${BASE}/seasons/${year}/${season.toLowerCase()}?limit=24`, signal).then(mapList),
  search: (query, signal) =>
    queued(`${BASE}/anime?q=${encodeURIComponent(query)}&limit=20&sfw`, signal).then(mapList),
  async detail(externalId, signal) {
    const { data: a } = await queued(`${BASE}/anime/${externalId}/full`, signal)
    const base = normalize(a)
    return {
      ...base,
      genres: (a.genres || []).map((g) => g.name),
      trailerKey: a.trailer?.youtube_id || null,
      tags: (a.themes || []).map((t) => t.name),
      rankings: a.rank ? [{ rank: a.rank, type: 'RATED', label: 'Ranked on MyAnimeList' }] : [],
      streaming: (a.streaming || []).map((s) => ({ site: s.name, url: s.url })),
      characters: [],
      relations: (a.relations || []).flatMap((r) =>
        (r.entry || []).map((e) => ({
          relation: r.relation,
          title: e.name,
          type: (e.type || '').toUpperCase(),
          externalId: e.type === 'anime' ? String(e.mal_id) : null,
        })),
      ),
      recommendations: [],
      creators: base.studios.slice(0, 3),
      people: [],
    }
  },
}
