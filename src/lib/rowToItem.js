// Slim metadata cache written when an item is saved to the library — only
// what cards, stats and recommendations need (~0.2 KB vs the full raw API
// payload, which for games ran ~12 KB). Works for both list items and detail
// items (detail adds runtime/episodes/playtime/pageCount).
export function itemToMetadata(item) {
  const raw = item.raw || {}
  return {
    overview: item.overview || '',
    year: item.year ?? null,
    rating: item.rating ?? null,
    posterUrl: item.posterUrl ?? null,
    backdropUrl: item.backdropUrl ?? null,
    genreIds: item.genreIds || [],
    // Time-invested inputs for the stats page (null when the source's list
    // payload doesn't carry them; stats falls back to per-category defaults).
    runtime: item.runtime ?? raw.runtime ?? raw.episode_run_time?.[0] ?? null,
    episodes: item.episodes ?? raw.episodes ?? raw.number_of_episodes ?? null,
    playtime: item.playtime ?? raw.playtime ?? null,
    pageCount: item.pageCount ?? raw.volumeInfo?.pageCount ?? null,
  }
}

// Convert a stored library row back into the normalized "item" shape the cards
// and detail modal expect. Prefers the slim metadata shape above; the *FromMeta
// helpers keep rows saved before it existed (full raw payloads) rendering.
export function rowToItem(row) {
  const m = row.metadata || {}
  return {
    category: row.category,
    externalId: row.external_id,
    title: row.title,
    posterUrl: row.poster_url || m.posterUrl || posterFromMeta(m),
    backdropUrl: m.backdropUrl || backdropFromMeta(m) || row.poster_url,
    year: m.year ?? yearFromMeta(m),
    rating: row.user_rating != null ? row.user_rating : m.rating ?? ratingFromMeta(m),
    overview:
      m.overview ||
      m.synopsis ||
      m.description ||
      m.description_raw ||
      m.volumeInfo?.description ||
      m.snippet?.description ||
      '',
    genreIds: Array.isArray(m.genreIds) ? m.genreIds : genreIdsFromMeta(m),
    raw: m,
    _userRating: row.user_rating,
    _status: row.status,
  }
}

// Each source stores genres differently in its raw payload.
function genreIdsFromMeta(m) {
  if (Array.isArray(m.genre_ids)) return m.genre_ids
  if (Array.isArray(m.genres)) {
    return m.genres.map((g) => (typeof g === 'string' ? g : g.name || g.slug)).filter(Boolean)
  }
  if (Array.isArray(m.volumeInfo?.categories)) return m.volumeInfo.categories
  return []
}

function posterFromMeta(m) {
  return m.poster_path
    ? `https://image.tmdb.org/t/p/w500${m.poster_path}`
    : m.images?.jpg?.large_image_url ||
        m.coverImage?.large ||
        m.background_image ||
        m.volumeInfo?.imageLinks?.thumbnail ||
        null
}
function backdropFromMeta(m) {
  return m.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}`
    : m.bannerImage || m.background_image || null
}
function yearFromMeta(m) {
  const d =
    m.release_date ||
    m.first_air_date ||
    m.volumeInfo?.publishedDate ||
    m.snippet?.publishedAt ||
    m.released ||
    m.year ||
    m.seasonYear
  return d ? Number(String(d).slice(0, 4)) : null
}
function ratingFromMeta(m) {
  if (typeof m.vote_average === 'number') return m.vote_average
  if (typeof m.score === 'number') return m.score
  if (typeof m.metacritic === 'number') return m.metacritic / 10
  if (typeof m.averageScore === 'number') return m.averageScore / 10
  return null
}
