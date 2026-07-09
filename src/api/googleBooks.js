import { fetchJson } from './http'
import { openLibrary } from './openLibrary'

// Google Books — a key is optional. If a key is present but its Cloud project
// doesn't have the Books API enabled (quota_limit_value "0" → 429), we retry
// keyless. If Google is unavailable altogether (its keyless quota is often 0
// too), every method falls back to Open Library so Books always works.
const KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY
const BASE = 'https://www.googleapis.com/books/v1/volumes'

// Once a keyed request fails for quota reasons, stop sending the key for the
// rest of the session so we don't pay the failed round-trip every time.
let keyDisabled = false

async function booksFetch(path, params, signal) {
  const q = params ? new URLSearchParams({ maxResults: '24', country: 'US', ...params }) : null
  const base = q ? `${BASE}${path}?${q}` : `${BASE}${path}`
  const sep = q ? '&' : '?'

  if (KEY && !keyDisabled) {
    try {
      return await fetchJson(`${base}${sep}key=${KEY}`, { signal })
    } catch (err) {
      if (err.name === 'AbortError') throw err
      keyDisabled = true // key rejected / quota 0 — fall through to keyless
    }
  }
  return fetchJson(base, { signal })
}

// Try Google, fall back to the equivalent Open Library call on any failure.
async function withFallback(googleFn, openLibraryFn) {
  try {
    return await googleFn()
  } catch (err) {
    if (err.name === 'AbortError') throw err
    return openLibraryFn()
  }
}

const httpsImg = (links) => {
  const src = links?.thumbnail || links?.smallThumbnail
  return src ? src.replace('http://', 'https://').replace('&edge=curl', '') : null
}

function normalize(v) {
  const info = v.volumeInfo || {}
  return {
    category: 'book',
    externalId: String(v.id),
    title: info.title || 'Untitled',
    posterUrl: httpsImg(info.imageLinks),
    // Book covers are tall — no wide art; null keeps the Hero from zoom-cropping.
    backdropUrl: null,
    year: info.publishedDate ? Number(String(info.publishedDate).slice(0, 4)) : null,
    // Google ratings are 0-5; scale to the app's 0-10.
    rating: typeof info.averageRating === 'number' ? info.averageRating * 2 : null,
    overview: info.description || '',
    genreIds: info.categories || [],
    authors: info.authors || [],
    raw: v,
  }
}

const mapList = (data) =>
  (data.items || []).filter((v) => v.volumeInfo?.imageLinks).map(normalize)

// Rotating popular subjects give a "trending"-ish shelf since Google Books has
// no trending endpoint.
const POPULAR_SUBJECT = 'subject:fiction'

export const googleBooks = {
  trending: (signal) =>
    withFallback(
      () => booksFetch('', { q: POPULAR_SUBJECT, orderBy: 'relevance' }, signal).then(mapList),
      () => openLibrary.trending(signal),
    ),
  topRated: (signal) =>
    withFallback(
      async () => {
        const data = await booksFetch('', { q: POPULAR_SUBJECT, orderBy: 'relevance' }, signal)
        return mapList(data)
          .filter((b) => b.rating != null)
          .sort((a, b) => b.rating - a.rating)
      },
      () => openLibrary.topRated(signal),
    ),
  newReleases: (signal) =>
    withFallback(
      () => booksFetch('', { q: POPULAR_SUBJECT, orderBy: 'newest' }, signal).then(mapList),
      () => openLibrary.newReleases(signal),
    ),
  search: (query, signal) =>
    withFallback(
      () => booksFetch('', { q: query, orderBy: 'relevance' }, signal).then(mapList),
      () => openLibrary.search(query, signal),
    ),
  byGenres: (genres, signal) =>
    withFallback(
      () => {
        const subject = genres[0] ? `subject:${genres[0]}` : POPULAR_SUBJECT
        return booksFetch('', { q: subject, orderBy: 'relevance' }, signal).then(mapList)
      },
      () => openLibrary.byGenres(genres, signal),
    ),
  async detail(id, signal) {
    // Open Library ids are prefixed "ol:"; route those straight to it.
    if (String(id).startsWith('ol:')) return openLibrary.detail(id, signal)
    const v = await booksFetch(`/${id}`, null, signal)
    const base = normalize(v)
    const info = v.volumeInfo || {}
    return {
      ...base,
      genres: info.categories || [],
      pageCount: info.pageCount || null,
      publisher: info.publisher || '',
      people: info.authors || [],
      creators: info.authors || [],
      tagline: info.subtitle || '',
    }
  },
}
