import { fetchJson } from './http'
import { openLibrary } from './openLibrary'

// Books adapter. Discovery shelves come from Open Library (it has real
// trending data and subject shelves, and no quota); search and volume detail
// try Google Books first — a key is optional, and if the key's project lacks
// the Books API (quota 0 → 429) we retry keyless — then fall back to Open
// Library so Books always works.
const KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY
const BASE = 'https://www.googleapis.com/books/v1/volumes'

// Once a keyed request fails, stop sending the key for the session.
let keyDisabled = false

async function booksFetch(path, params, signal) {
  const q = params ? new URLSearchParams({ maxResults: '24', country: 'US', printType: 'books', ...params }) : null
  const base = q ? `${BASE}${path}?${q}` : `${BASE}${path}`
  const sep = q ? '&' : '?'

  if (KEY && !keyDisabled) {
    try {
      return await fetchJson(`${base}${sep}key=${KEY}`, { signal })
    } catch (err) {
      if (err.name === 'AbortError') throw err
      keyDisabled = true
    }
  }
  return fetchJson(base, { signal })
}

async function withFallback(primary, fallback) {
  try {
    return await primary()
  } catch (err) {
    if (err.name === 'AbortError') throw err
    return fallback()
  }
}

const httpsImg = (links) => {
  const src = links?.extraLarge || links?.large || links?.medium || links?.thumbnail || links?.smallThumbnail
  return src ? src.replace('http://', 'https://').replace('&edge=curl', '') : null
}

function normalize(v) {
  const info = v.volumeInfo || {}
  return {
    category: 'book',
    externalId: String(v.id),
    title: info.title || 'Untitled',
    subtitle: info.subtitle || '',
    posterUrl: httpsImg(info.imageLinks),
    backdropUrl: null,
    year: info.publishedDate ? Number(String(info.publishedDate).slice(0, 4)) : null,
    // Google ratings are 0-5; scale to the app's 0-10.
    rating: typeof info.averageRating === 'number' ? info.averageRating * 2 : null,
    ratingsCount: info.ratingsCount ?? null,
    overview: (info.description || '').replace(/<[^>]+>/g, ''),
    genreIds: info.categories || [],
    authors: info.authors || [],
    pageCount: info.pageCount || null,
    raw: { genres: info.categories || [] },
  }
}

const mapList = (data) => (data.items || []).filter((v) => v.volumeInfo?.imageLinks).map(normalize)

export const googleBooks = {
  trending: (signal) =>
    withFallback(
      () => openLibrary.trending(signal),
      () => booksFetch('', { q: 'subject:fiction', orderBy: 'relevance' }, signal).then(mapList),
    ),
  topRated: (signal) =>
    withFallback(
      () => openLibrary.topRated(signal),
      async () => {
        const data = await booksFetch('', { q: 'subject:fiction', orderBy: 'relevance' }, signal)
        return mapList(data)
          .filter((b) => b.rating != null)
          .sort((a, b) => b.rating - a.rating)
      },
    ),
  newReleases: (signal) =>
    withFallback(
      () => booksFetch('', { q: 'subject:fiction', orderBy: 'newest' }, signal).then(mapList),
      () => openLibrary.newReleases(signal),
    ),
  subject: (name, signal) =>
    withFallback(
      () => openLibrary.subject(name, signal),
      () => booksFetch('', { q: `subject:${name}`, orderBy: 'relevance' }, signal).then(mapList),
    ),
  search: (query, signal) =>
    withFallback(
      () => booksFetch('', { q: query, orderBy: 'relevance' }, signal).then(mapList),
      () => openLibrary.search(query, signal),
    ),
  byGenres: (genres, signal) =>
    withFallback(
      () => openLibrary.byGenres(genres, signal),
      () => booksFetch('', { q: genres[0] ? `subject:${genres[0]}` : 'subject:fiction' }, signal).then(mapList),
    ),
  async detail(id, signal) {
    if (String(id).startsWith('ol:')) return openLibrary.detail(id, signal)
    const v = await booksFetch(`/${id}`, null, signal)
    const base = normalize(v)
    const info = v.volumeInfo || {}
    return {
      ...base,
      genres: info.categories || [],
      publisher: info.publisher || '',
      publishDate: info.publishedDate || null,
      isbn: (info.industryIdentifiers || []).find((x) => x.type === 'ISBN_13')?.identifier || null,
      people: info.authors || [],
      creators: info.authors || [],
      tagline: info.subtitle || '',
      shelves: null,
    }
  },
}

// Subject shelves for the reading room.
export const BOOK_SHELVES = [
  { subject: 'fantasy', title: 'Fantasy', blurb: 'Dragons, magic systems and other worlds.' },
  { subject: 'science_fiction', title: 'Science Fiction', blurb: 'Futures, first contacts and far-flung stars.' },
  { subject: 'mystery_and_detective_stories', title: 'Mystery & Detective', blurb: 'Whodunits to keep you up past midnight.' },
  { subject: 'romance', title: 'Romance', blurb: 'Slow burns and grand gestures.' },
  { subject: 'historical_fiction', title: 'Historical Fiction', blurb: 'Lives lived in other centuries.' },
  { subject: 'classics', title: 'The Classics', blurb: 'Books that have outlived their authors.' },
  { subject: 'biography', title: 'Biography & Memoir', blurb: 'True lives, told up close.' },
  { subject: 'history', title: 'History', blurb: 'How we got here.' },
]
