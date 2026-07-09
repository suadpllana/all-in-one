import { fetchJson, requireKey } from './http'

const KEY = import.meta.env.VITE_TMDB_API_KEY
const BASE = 'https://api.themoviedb.org/3'
const IMG = 'https://image.tmdb.org/t/p'
const DOC_GENRE = 99

const poster = (path, size = 'w500') =>
  path ? `${IMG}/${size}${path}` : null
const backdrop = (path) => (path ? `${IMG}/w1280${path}` : null)
const yearOf = (date) => (date ? Number(String(date).slice(0, 4)) : null)

function url(path, params = {}) {
  requireKey(KEY, 'TMDB')
  const q = new URLSearchParams({ api_key: KEY, ...params })
  return `${BASE}${path}?${q}`
}

// Normalize a TMDB movie/tv result into the app's common item shape.
function normalize(category, r) {
  return {
    category,
    externalId: String(r.id),
    title: r.title || r.name || 'Untitled',
    posterUrl: poster(r.poster_path),
    backdropUrl: backdrop(r.backdrop_path),
    year: yearOf(r.release_date || r.first_air_date),
    rating: typeof r.vote_average === 'number' ? r.vote_average : null,
    overview: r.overview || '',
    genreIds: r.genre_ids || (r.genres || []).map((g) => g.id),
    raw: r,
  }
}

const mapList = (category) => (data) =>
  (data.results || []).filter((r) => r.poster_path).map((r) => normalize(category, r))

// ---- Movies -------------------------------------------------------------
async function movieTrending(signal) {
  return fetchJson(url('/trending/movie/week'), { signal }).then(mapList('movie'))
}
async function movieTopRated(signal) {
  return fetchJson(url('/movie/top_rated'), { signal }).then(mapList('movie'))
}
async function movieNew(signal) {
  const data = await fetchJson(url('/movie/now_playing'), { signal })
  return mapList('movie')(data).sort(
    (a, b) => (b.raw.release_date || '').localeCompare(a.raw.release_date || ''),
  )
}
async function movieSearch(query, signal) {
  return fetchJson(url('/search/movie', { query }), { signal }).then(mapList('movie'))
}
async function movieByGenres(ids, signal) {
  return fetchJson(
    url('/discover/movie', { with_genres: ids.join(','), sort_by: 'popularity.desc' }),
    { signal },
  ).then(mapList('movie'))
}

// ---- TV -----------------------------------------------------------------
// Anime has its own category (Jikan/AniList), so keep it out of TV Shows:
// drop Animation-genre shows of Japanese origin.
const ANIMATION_GENRE = 16
const isAnime = (r) =>
  (r.genre_ids || (r.genres || []).map((g) => g.id)).includes(ANIMATION_GENRE) &&
  (r.original_language === 'ja' || (r.origin_country || []).includes('JP'))

const mapTvList = (data) => mapList('tv')(data).filter((item) => !isAnime(item.raw))

async function tvTrending(signal) {
  return fetchJson(url('/trending/tv/week'), { signal }).then(mapTvList)
}
async function tvTopRated(signal) {
  return fetchJson(url('/tv/top_rated'), { signal }).then(mapTvList)
}
async function tvNew(signal) {
  const data = await fetchJson(url('/tv/on_the_air'), { signal })
  return mapTvList(data).sort(
    (a, b) => (b.raw.first_air_date || '').localeCompare(a.raw.first_air_date || ''),
  )
}
async function tvSearch(query, signal) {
  return fetchJson(url('/search/tv', { query }), { signal }).then(mapTvList)
}
async function tvByGenres(ids, signal) {
  return fetchJson(
    url('/discover/tv', { with_genres: ids.join(','), sort_by: 'popularity.desc' }),
    { signal },
  ).then(mapTvList)
}

// ---- Documentaries (movies filtered by the Documentary genre) -----------
const docParams = (extra) => ({ with_genres: String(DOC_GENRE), ...extra })
async function docTrending(signal) {
  return fetchJson(url('/discover/movie', docParams({ sort_by: 'popularity.desc' })), {
    signal,
  }).then(mapList('documentary'))
}
async function docTopRated(signal) {
  return fetchJson(
    url('/discover/movie', docParams({ sort_by: 'vote_average.desc', 'vote_count.gte': '100' })),
    { signal },
  ).then(mapList('documentary'))
}
async function docNew(signal) {
  const today = new Date().toISOString().slice(0, 10)
  return fetchJson(
    url('/discover/movie', docParams({
      sort_by: 'primary_release_date.desc',
      'primary_release_date.lte': today,
      'vote_count.gte': '10',
    })),
    { signal },
  ).then(mapList('documentary'))
}
async function docSearch(query, signal) {
  const data = await fetchJson(url('/search/movie', { query }), { signal })
  return mapList('documentary')({
    results: (data.results || []).filter((r) => (r.genre_ids || []).includes(DOC_GENRE)),
  })
}

// ---- Detail (shared movie/tv) ------------------------------------------
async function detail(category, id, signal) {
  const path = category === 'tv' ? `/tv/${id}` : `/movie/${id}`
  const r = await fetchJson(url(path, { append_to_response: 'credits' }), { signal })
  const base = normalize(category, r)
  return {
    ...base,
    genres: (r.genres || []).map((g) => g.name),
    runtime: r.runtime || (r.episode_run_time && r.episode_run_time[0]) || null,
    seasons: r.number_of_seasons ?? null,
    episodes: r.number_of_episodes ?? null,
    tagline: r.tagline || '',
    status: r.status || '',
    people: (r.credits?.cast || []).slice(0, 8).map((c) => c.name),
    creators: (r.credits?.crew || [])
      .filter((c) => c.job === 'Director' || c.job === 'Creator')
      .map((c) => c.name)
      .slice(0, 3),
  }
}

export const tmdb = {
  movie: {
    trending: movieTrending,
    topRated: movieTopRated,
    newReleases: movieNew,
    search: movieSearch,
    byGenres: movieByGenres,
    detail: (id, signal) => detail('movie', id, signal),
  },
  tv: {
    trending: tvTrending,
    topRated: tvTopRated,
    newReleases: tvNew,
    search: tvSearch,
    byGenres: tvByGenres,
    detail: (id, signal) => detail('tv', id, signal),
  },
  documentary: {
    trending: docTrending,
    topRated: docTopRated,
    newReleases: docNew,
    search: docSearch,
    byGenres: (ids, signal) =>
      fetchJson(
        url('/discover/movie', docParams({ with_genres: [DOC_GENRE, ...ids].join(',') })),
        { signal },
      ).then(mapList('documentary')),
    detail: (id, signal) => detail('documentary', id, signal),
  },
}
