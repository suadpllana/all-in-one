import { fetchJson, requireKey } from './http'

const KEY = import.meta.env.VITE_TMDB_API_KEY
const BASE = 'https://api.themoviedb.org/3'
const IMG = 'https://image.tmdb.org/t/p'
const DOC_GENRE = 99

export const tmdbImg = (path, size = 'w500') => (path ? `${IMG}/${size}${path}` : null)
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
    originalTitle: r.original_title || r.original_name || null,
    posterUrl: tmdbImg(r.poster_path),
    backdropUrl: tmdbImg(r.backdrop_path, 'w1280'),
    year: yearOf(r.release_date || r.first_air_date),
    releaseDate: r.release_date || r.first_air_date || null,
    rating: typeof r.vote_average === 'number' && r.vote_count ? r.vote_average : null,
    voteCount: r.vote_count ?? null,
    overview: r.overview || '',
    genreIds: r.genre_ids || (r.genres || []).map((g) => g.id),
    originalLanguage: r.original_language || null,
    raw: r,
  }
}

const mapList = (category) => (data) =>
  (data.results || []).filter((r) => r.poster_path).map((r) => normalize(category, r))

// TMDB's list endpoints don't carry runtime, episode counts or networks —
// only the detail payload does. Cards want them, so fetch details for a page
// of results and fold them in. Memoized for the session: shelves overlap
// heavily, so the same id would otherwise be re-fetched repeatedly.
const extrasCache = new Map()

function fetchExtras(category, id) {
  const key = `${category === 'tv' ? 'tv' : 'movie'}:${id}`
  if (extrasCache.has(key)) return extrasCache.get(key)
  // Not passing the caller's abort signal: the promise is shared between
  // callers, so one unmounting component must not reject it for the rest.
  const path = category === 'tv' ? `/tv/${id}` : `/movie/${id}`
  const promise = fetchJson(url(path))
    .then((r) => ({
      runtime: r.runtime || r.episode_run_time?.[0] || null,
      episodes: r.number_of_episodes ?? null,
      seasons: r.number_of_seasons ?? null,
      network: r.networks?.[0]?.name ?? null,
      showStatus: r.status ?? null,
      tagline: r.tagline || '',
    }))
    // A failed lookup shouldn't blank the shelf; drop it so a later render
    // can retry.
    .catch(() => {
      extrasCache.delete(key)
      return null
    })
  extrasCache.set(key, promise)
  return promise
}

async function withExtras(items) {
  const extras = await Promise.all(items.map((item) => fetchExtras(item.category, item.externalId)))
  return items.map((item, i) => (extras[i] ? { ...item, ...extras[i] } : item))
}

const list = (category, path, params, signal, map = mapList(category)) =>
  fetchJson(url(path, params), { signal }).then(map).then(withExtras)

// ---- Movies -------------------------------------------------------------
const byRelease = (a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || '')

const movie = {
  trending: (signal) => list('movie', '/trending/movie/week', {}, signal),
  topRated: (signal) => list('movie', '/movie/top_rated', {}, signal),
  newReleases: (signal) =>
    fetchJson(url('/movie/now_playing'), { signal })
      .then((d) => mapList('movie')(d).sort(byRelease))
      .then(withExtras),
  // Future releases only, soonest first.
  upcoming: (signal) =>
    fetchJson(url('/movie/upcoming'), { signal })
      .then((d) => {
        const today = new Date().toISOString().slice(0, 10)
        return mapList('movie')(d)
          .filter((m) => (m.releaseDate || '') > today)
          .sort((a, b) => (a.releaseDate || '').localeCompare(b.releaseDate || ''))
      })
      .then(withExtras),
  search: (query, signal) => list('movie', '/search/movie', { query }, signal),
  byGenres: (ids, signal) =>
    list('movie', '/discover/movie', { with_genres: ids.join(','), sort_by: 'popularity.desc' }, signal),
  // Paged genre browsing: { genre, sort: 'popular' | 'top' | 'new', page }
  discover: ({ genre, sort = 'popular', page = 1 }, signal) =>
    fetchJson(url('/discover/movie', discoverParams({ genre, sort, page })), { signal }).then(async (d) => ({
      items: await withExtras(mapList('movie')(d)),
      page: d.page,
      totalPages: Math.min(d.total_pages || 1, 50),
    })),
  detail: (id, signal) => detail('movie', id, signal),
}

function discoverParams({ genre, sort, page, extraGenre }) {
  const params = { page: String(page), 'vote_count.gte': sort === 'top' ? '300' : '20' }
  const genres = [extraGenre, genre].filter(Boolean)
  if (genres.length) params.with_genres = genres.join(',')
  params.sort_by = sort === 'top' ? 'vote_average.desc' : sort === 'new' ? 'primary_release_date.desc' : 'popularity.desc'
  if (sort === 'new') params['primary_release_date.lte'] = new Date().toISOString().slice(0, 10)
  return params
}

// ---- TV -----------------------------------------------------------------
// Anime and documentaries have their own worlds, so keep them out of TV:
// drop Animation-genre shows of Japanese origin and anything tagged
// Documentary.
const ANIMATION_GENRE = 16
const genreIdsOf = (r) => r.genre_ids || (r.genres || []).map((g) => g.id)
const isAnime = (r) =>
  genreIdsOf(r).includes(ANIMATION_GENRE) &&
  (r.original_language === 'ja' || (r.origin_country || []).includes('JP'))
const isDoc = (r) => genreIdsOf(r).includes(DOC_GENRE)
const mapTvList = (data) => mapList('tv')(data).filter((item) => !isAnime(item.raw) && !isDoc(item.raw))

const tv = {
  trending: (signal) => list('tv', '/trending/tv/week', {}, signal, mapTvList),
  topRated: (signal) => list('tv', '/tv/top_rated', {}, signal, mapTvList),
  newReleases: (signal) =>
    fetchJson(url('/tv/on_the_air'), { signal })
      .then((d) => mapTvList(d).sort(byRelease))
      .then(withExtras),
  airingToday: (signal) => list('tv', '/tv/airing_today', {}, signal, mapTvList),
  search: (query, signal) => list('tv', '/search/tv', { query }, signal, mapTvList),
  byGenres: (ids, signal) =>
    list('tv', '/discover/tv', { with_genres: ids.join(','), sort_by: 'popularity.desc' }, signal, mapTvList),
  discover: ({ genre, sort = 'popular', page = 1 }, signal) => {
    const params = { page: String(page), 'vote_count.gte': sort === 'top' ? '200' : '20' }
    if (genre) params.with_genres = String(genre)
    params.sort_by = sort === 'top' ? 'vote_average.desc' : sort === 'new' ? 'first_air_date.desc' : 'popularity.desc'
    if (sort === 'new') params['first_air_date.lte'] = new Date().toISOString().slice(0, 10)
    params.without_genres = `${DOC_GENRE}`
    return fetchJson(url('/discover/tv', params), { signal }).then(async (d) => ({
      items: await withExtras(mapTvList(d)),
      page: d.page,
      totalPages: Math.min(d.total_pages || 1, 50),
    }))
  },
  // Episodes of one season, for the episode tracker.
  season: async (id, number, signal) => {
    const s = await fetchJson(url(`/tv/${id}/season/${number}`), { signal })
    return {
      number: s.season_number,
      name: s.name,
      overview: s.overview || '',
      airDate: s.air_date || null,
      episodes: (s.episodes || []).map((e) => ({
        number: e.episode_number,
        name: e.name || `Episode ${e.episode_number}`,
        overview: e.overview || '',
        airDate: e.air_date || null,
        runtime: e.runtime || null,
        stillUrl: tmdbImg(e.still_path, 'w300'),
        rating: e.vote_average || null,
      })),
    }
  },
  detail: (id, signal) => detail('tv', id, signal),
}

// ---- Documentaries (movies tagged with the Documentary genre) ----------
const docParams = (extra) => ({ with_genres: String(DOC_GENRE), ...extra })

const documentary = {
  trending: (signal) =>
    list('documentary', '/discover/movie', docParams({ sort_by: 'popularity.desc' }), signal),
  topRated: (signal) =>
    list(
      'documentary',
      '/discover/movie',
      docParams({ sort_by: 'vote_average.desc', 'vote_count.gte': '100' }),
      signal,
    ),
  newReleases: (signal) =>
    list(
      'documentary',
      '/discover/movie',
      docParams({
        sort_by: 'primary_release_date.desc',
        'primary_release_date.lte': new Date().toISOString().slice(0, 10),
        'vote_count.gte': '10',
      }),
      signal,
    ),
  // Topic shelves: Documentary AND another genre (History, Music, Crime…).
  byTopic: (genreId, signal) =>
    list(
      'documentary',
      '/discover/movie',
      docParams({ with_genres: `${DOC_GENRE},${genreId}`, sort_by: 'popularity.desc', 'vote_count.gte': '15' }),
      signal,
    ),
  search: async (query, signal) => {
    const data = await fetchJson(url('/search/movie', { query }), { signal })
    const items = mapList('documentary')({
      results: (data.results || []).filter((r) => (r.genre_ids || []).includes(DOC_GENRE)),
    })
    return withExtras(items)
  },
  byGenres: (ids, signal) =>
    list(
      'documentary',
      '/discover/movie',
      docParams({ with_genres: [DOC_GENRE, ...ids.filter((g) => g !== DOC_GENRE)].join(','), sort_by: 'popularity.desc' }),
      signal,
    ),
  discover: ({ genre, sort = 'popular', page = 1 }, signal) =>
    fetchJson(url('/discover/movie', discoverParams({ genre, sort, page, extraGenre: DOC_GENRE })), { signal }).then(
      async (d) => ({
        items: await withExtras(mapList('documentary')(d)),
        page: d.page,
        totalPages: Math.min(d.total_pages || 1, 50),
      }),
    ),
  detail: (id, signal) => detail('documentary', id, signal),
}

// ---- Detail (shared movie/tv/documentary) ------------------------------
function pickTrailer(videos) {
  const yt = (videos?.results || []).filter((v) => v.site === 'YouTube' && v.key)
  const rank = (v) => (v.type === 'Trailer' ? 0 : v.type === 'Teaser' ? 1 : 2) - (v.official ? 0.5 : 0)
  return yt.sort((a, b) => rank(a) - rank(b))[0]?.key || null
}

function certification(category, r) {
  if (category === 'tv') {
    return r.content_ratings?.results?.find((x) => x.iso_3166_1 === 'US')?.rating || null
  }
  const us = r.release_dates?.results?.find((x) => x.iso_3166_1 === 'US')
  const dates = us?.release_dates || []
  return (dates.find((d) => d.type === 3 && d.certification) || dates.find((d) => d.certification))?.certification || null
}

const person = (p) => ({
  name: p.name,
  role: p.character || p.roles?.[0]?.character || p.job || '',
  photo: tmdbImg(p.profile_path, 'w185'),
  episodes: p.total_episode_count || null,
})

async function detail(category, id, signal) {
  const isTv = category === 'tv'
  const append = isTv
    ? 'aggregate_credits,credits,videos,recommendations,content_ratings'
    : 'credits,videos,recommendations,release_dates'
  const r = await fetchJson(url(isTv ? `/tv/${id}` : `/movie/${id}`, { append_to_response: append }), { signal })
  const base = normalize(category, r)
  const crew = r.credits?.crew || []
  const jobs = (...names) => [...new Set(crew.filter((c) => names.includes(c.job)).map((c) => c.name))]
  const castSource = (isTv && r.aggregate_credits?.cast?.length ? r.aggregate_credits.cast : r.credits?.cast) || []
  const seasonsList = (r.seasons || [])
    .filter((s) => s.season_number > 0)
    .map((s) => ({
      number: s.season_number,
      name: s.name,
      episodeCount: s.episode_count || 0,
      airDate: s.air_date || null,
      posterUrl: tmdbImg(s.poster_path, 'w342'),
    }))
  const recommendationsMap = isTv ? mapTvList : mapList(category === 'documentary' ? 'documentary' : category)
  const next = r.next_episode_to_air

  return {
    ...base,
    genres: (r.genres || []).map((g) => g.name),
    runtime: r.runtime || r.episode_run_time?.[0] || next?.runtime || r.last_episode_to_air?.runtime || null,
    seasons: r.number_of_seasons ?? null,
    episodes: r.number_of_episodes ?? null,
    seasonsList,
    seasonEpisodes: seasonsList.length ? seasonsList.map((s) => s.episodeCount) : null,
    nextEpisode: next
      ? { season: next.season_number, episode: next.episode_number, name: next.name, airDate: next.air_date }
      : null,
    lastAirDate: r.last_air_date || null,
    inProduction: r.in_production ?? null,
    showStatus: r.status || '',
    network: r.networks?.[0]?.name || null,
    networks: (r.networks || []).map((n) => n.name),
    tagline: r.tagline || '',
    certification: certification(category, r),
    trailerKey: pickTrailer(r.videos),
    cast: castSource.slice(0, 18).map(person),
    directors: isTv ? (r.created_by || []).map((c) => c.name) : jobs('Director'),
    writers: jobs('Screenplay', 'Writer', 'Story', 'Novel'),
    composer: jobs('Original Music Composer', 'Music'),
    cinematographer: jobs('Director of Photography'),
    editor: jobs('Editor'),
    budget: r.budget || null,
    revenue: r.revenue || null,
    companies: (r.production_companies || []).map((c) => c.name).slice(0, 4),
    countries: (r.production_countries || r.origin_country || []).map((c) => c.name || c).slice(0, 3),
    languages: (r.spoken_languages || []).map((l) => l.english_name || l.name).slice(0, 3),
    recommendations: recommendationsMap({ results: r.recommendations?.results || [] }).slice(0, 16),
    // Legacy fields used by generic components.
    people: castSource.slice(0, 8).map((c) => c.name),
    creators: isTv ? (r.created_by || []).map((c) => c.name).slice(0, 3) : jobs('Director').slice(0, 3),
  }
}

// Genre catalogues for browse tiles.
export const MOVIE_GENRES = [
  { id: 28, name: 'Action', icon: 'zap' },
  { id: 12, name: 'Adventure', icon: 'map' },
  { id: 16, name: 'Animation', icon: 'sparkles' },
  { id: 35, name: 'Comedy', icon: 'laugh' },
  { id: 80, name: 'Crime', icon: 'crosshair' },
  { id: 18, name: 'Drama', icon: 'mask' },
  { id: 14, name: 'Fantasy', icon: 'castle' },
  { id: 27, name: 'Horror', icon: 'ghost' },
  { id: 9648, name: 'Mystery', icon: 'search' },
  { id: 10749, name: 'Romance', icon: 'heart' },
  { id: 878, name: 'Sci-Fi', icon: 'rocket' },
  { id: 53, name: 'Thriller', icon: 'bolt' },
]

export const TV_GENRES = [
  { id: 18, name: 'Drama', icon: 'mask' },
  { id: 35, name: 'Comedy', icon: 'laugh' },
  { id: 80, name: 'Crime', icon: 'crosshair' },
  { id: 10765, name: 'Sci-Fi & Fantasy', icon: 'rocket' },
  { id: 9648, name: 'Mystery', icon: 'search' },
  { id: 10759, name: 'Action & Adventure', icon: 'zap' },
  { id: 10768, name: 'War & Politics', icon: 'landmark' },
  { id: 10751, name: 'Family', icon: 'users' },
  { id: 10764, name: 'Reality', icon: 'broadcast' },
  { id: 16, name: 'Animation', icon: 'sparkles' },
]

export const DOC_TOPICS = [
  { id: 36, name: 'History', icon: 'landmark', blurb: 'Empires, revolutions, and the people who shaped them.' },
  { id: 80, name: 'True Crime', icon: 'crosshair', blurb: 'Cases, cons and the search for the truth.' },
  { id: 10402, name: 'Music', icon: 'music', blurb: 'Legends, scenes and the sound of a generation.' },
  { id: 10752, name: 'War & Conflict', icon: 'flag', blurb: 'Frontlines, survivors and the cost of war.' },
  { id: 12, name: 'Adventure', icon: 'compass', blurb: 'Summits, oceans and the edges of the map.' },
  { id: 10751, name: 'Family & Nature', icon: 'leaf', blurb: 'Wild places and the creatures that live there.' },
]

export const tmdb = { movie, tv, documentary }
