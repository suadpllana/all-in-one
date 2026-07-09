import { fetchJson } from './http'
import { anilist } from './anilist'

// Jikan v4 — unofficial MyAnimeList API, no key required. Rate limited
// (~3 req/s, 60/min) so react-query caching + AniList fallback matter.
const BASE = 'https://api.jikan.moe/v4'

function normalize(a) {
  return {
    category: 'anime',
    externalId: String(a.mal_id),
    title: a.title_english || a.title || 'Untitled',
    posterUrl: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || null,
    // Jikan only has tall 2:3 posters — no wide banner art. Leave the backdrop
    // null so the Hero uses its poster treatment instead of zoom-cropping.
    backdropUrl: null,
    year: a.year || (a.aired?.prop?.from?.year ?? null),
    rating: typeof a.score === 'number' ? a.score : null,
    overview: a.synopsis || '',
    genreIds: (a.genres || []).map((g) => g.name),
    raw: a,
  }
}

const mapList = (data) =>
  (data.data || []).filter((a) => a.images?.jpg?.image_url).map(normalize)

// Each Jikan call falls back to AniList on failure so the anime page still
// renders when MAL is rate-limited or down.
async function withFallback(jikanFn, anilistFn) {
  try {
    return await jikanFn()
  } catch (err) {
    if (err.name === 'AbortError') throw err
    return anilistFn()
  }
}

export const jikan = {
  trending: (signal) =>
    withFallback(
      () => fetchJson(`${BASE}/top/anime?filter=airing&limit=20`, { signal }).then(mapList),
      () => anilist.trending(signal),
    ),
  topRated: (signal) =>
    withFallback(
      () => fetchJson(`${BASE}/top/anime?limit=20`, { signal }).then(mapList),
      () => anilist.topRated(signal),
    ),
  newReleases: (signal) =>
    withFallback(
      () => fetchJson(`${BASE}/seasons/now?limit=20`, { signal }).then(mapList),
      () => anilist.newReleases(signal),
    ),
  search: (query, signal) =>
    withFallback(
      () =>
        fetchJson(`${BASE}/anime?q=${encodeURIComponent(query)}&limit=20&sfw`, { signal }).then(
          mapList,
        ),
      () => anilist.search(query, signal),
    ),
  byGenres: (genres, signal) =>
    // Jikan genre filtering needs numeric ids; simplest to defer to AniList
    // which accepts genre names (the shape we cache).
    anilist.byGenres(genres, signal).catch(() => []),
  async detail(externalId, signal) {
    // AniList ids are prefixed "al:"; route those straight to AniList.
    if (String(externalId).startsWith('al:')) return anilist.detail(externalId, signal)
    try {
      const { data: a } = await fetchJson(`${BASE}/anime/${externalId}/full`, { signal })
      const base = normalize(a)
      return {
        ...base,
        genres: (a.genres || []).map((g) => g.name),
        runtime: a.duration ? parseInt(a.duration, 10) || null : null,
        episodes: a.episodes || null,
        people: [],
        creators: (a.studios || []).map((s) => s.name).slice(0, 3),
        tagline: (a.title_japanese && `${a.title_japanese}`) || '',
      }
    } catch (err) {
      if (err.name === 'AbortError') throw err
      return anilist.detail(externalId, signal)
    }
  },
}
