// Convert a stored library row back into the normalized "item" shape the cards
// and detail modal expect. Uses cached metadata (the raw API response) where
// available so we don't need to re-fetch just to render a poster.
export function rowToItem(row) {
  const m = row.metadata || {}
  return {
    category: row.category,
    externalId: row.external_id,
    title: row.title,
    posterUrl: row.poster_url || posterFromMeta(m),
    backdropUrl: backdropFromMeta(m) || row.poster_url,
    year: yearFromMeta(m),
    rating: row.user_rating != null ? row.user_rating : ratingFromMeta(m),
    overview: m.overview || m.synopsis || m.description || m.description_raw || '',
    raw: m,
    _userRating: row.user_rating,
    _status: row.status,
  }
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
