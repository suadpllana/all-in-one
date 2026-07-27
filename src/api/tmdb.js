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

// TMDB's list endpoints (trending, top_rated, discover, search) don't carry
// runtime or episode counts — only the detail payload does. Cards want a
// duration, so fetch the details for a page of results and fold them in.
//
// The results are memoized for the session: shelves overlap heavily (a film is
// often in both Trending and Top Rated) and posters re-render often, so without
// this the same id would be re-fetched repeatedly.
const runtimeCache = new Map()

function cacheKey(category, id) {
  return `${category === 'tv' ? 'tv' : 'movie'}:${id}`
}

async function fetchRuntime(category, id) {
  const key = cacheKey(category, id)
  if (runtimeCache.has(key)) return runtimeCache.get(key)

  // Deliberately not passing the caller's abort signal: the promise is shared
  // between callers, so one component unmounting must not reject it for the
  // rest. These are small, cacheable GETs — letting them finish is cheap.
  const path = category === 'tv' ? `/tv/${id}` : `/movie/${id}`
  const promise = fetchJson(url(path))
    .then((r) => ({
      runtime: r.runtime || r.episode_run_time?.[0] || null,
      episodes: r.number_of_episodes ?? null,
      seasons: r.number_of_seasons ?? null,
    }))
    // A single failed lookup shouldn't blank the shelf — the card just renders
    // without a duration. Drop it from the cache so a later render can retry.
    .catch(() => {
      runtimeCache.delete(key)
      return null
    })

  runtimeCache.set(key, promise)
  return promise
}

// Enrich a mapped list in place-ish (returns a new array). Runs the lookups in
// parallel; ~20 detail calls complete in well under a second.
async function withDurations(items) {
  const details = await Promise.all(
    items.map((item) => fetchRuntime(item.category, item.externalId)),
  )
  return items.map((item, i) =>
    details[i] ? { ...item, ...details[i] } : item,
  )
}

// ---- Movies -------------------------------------------------------------
async function movieTrending(signal) {
  return fetchJson(url('/trending/movie/week'), { signal })
    .then(mapList('movie'))
    .then(withDurations)
}
async function movieTopRated(signal) {
  return fetchJson(url('/movie/top_rated'), { signal })
    .then(mapList('movie'))
    .then(withDurations)
}
async function movieNew(signal) {
  const data = await fetchJson(url('/movie/now_playing'), { signal })
  const sorted = mapList('movie')(data).sort(
    (a, b) => (b.raw.release_date || '').localeCompare(a.raw.release_date || ''),
  )
  return withDurations(sorted)
}
async function movieSearch(query, signal) {
  return fetchJson(url('/search/movie', { query }), { signal })
    .then(mapList('movie'))
    .then(withDurations)
}
async function movieByGenres(ids, signal) {
  return fetchJson(
    url('/discover/movie', { with_genres: ids.join(','), sort_by: 'popularity.desc' }),
    { signal },
  )
    .then(mapList('movie'))
    .then(withDurations)
}

// ---- TV -----------------------------------------------------------------
// Anime and documentaries have their own categories, so keep them out of TV
// Shows: drop Animation-genre shows of Japanese origin and anything tagged
// with the Documentary genre.
const ANIMATION_GENRE = 16
const genreIdsOf = (r) => r.genre_ids || (r.genres || []).map((g) => g.id)
const isAnime = (r) =>
  genreIdsOf(r).includes(ANIMATION_GENRE) &&
  (r.original_language === 'ja' || (r.origin_country || []).includes('JP'))
const isDoc = (r) => genreIdsOf(r).includes(DOC_GENRE)

const mapTvList = (data) =>
  mapList('tv')(data).filter((item) => !isAnime(item.raw) && !isDoc(item.raw))

async function tvTrending(signal) {
  return fetchJson(url('/trending/tv/week'), { signal }).then(mapTvList).then(withDurations)
}
async function tvTopRated(signal) {
  return fetchJson(url('/tv/top_rated'), { signal }).then(mapTvList).then(withDurations)
}
async function tvNew(signal) {
  const data = await fetchJson(url('/tv/on_the_air'), { signal })
  const sorted = mapTvList(data).sort(
    (a, b) => (b.raw.first_air_date || '').localeCompare(a.raw.first_air_date || ''),
  )
  return withDurations(sorted)
}
async function tvSearch(query, signal) {
  return fetchJson(url('/search/tv', { query }), { signal }).then(mapTvList).then(withDurations)
}
async function tvByGenres(ids, signal) {
  return fetchJson(
    url('/discover/tv', { with_genres: ids.join(','), sort_by: 'popularity.desc' }),
    { signal },
  )
    .then(mapTvList)
    .then(withDurations)
}

// ---- Documentaries (movies filtered by the Documentary genre) -----------
const docParams = (extra) => ({ with_genres: String(DOC_GENRE), ...extra })
async function docTrending(signal) {
  return fetchJson(url('/discover/movie', docParams({ sort_by: 'popularity.desc' })), {
    signal,
  })
    .then(mapList('documentary'))
    .then(withDurations)
}
async function docTopRated(signal) {
  return fetchJson(
    url('/discover/movie', docParams({ sort_by: 'vote_average.desc', 'vote_count.gte': '100' })),
    { signal },
  )
    .then(mapList('documentary'))
    .then(withDurations)
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
  )
    .then(mapList('documentary'))
    .then(withDurations)
}
async function docSearch(query, signal) {
  const data = await fetchJson(url('/search/movie', { query }), { signal })
  const items = mapList('documentary')({
    results: (data.results || []).filter((r) => (r.genre_ids || []).includes(DOC_GENRE)),
  })
  return withDurations(items)
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
      )
        .then(mapList('documentary'))
        .then(withDurations),
    detail: (id, signal) => detail('documentary', id, signal),
  },
}
