import { fetchJson } from './http'

// Open Library — free, no key, no per-project quota. Primary source for book
// discovery (real weekly trending + subject shelves) and the fallback for
// search/detail when Google Books is unavailable.
const OL = 'https://openlibrary.org'
const FIELDS =
  'key,title,author_name,first_publish_year,cover_i,cover_edition_key,ratings_average,ratings_count,subject,number_of_pages_median,edition_count,want_to_read_count'

const cover = (id, size = 'L') => (id ? `https://covers.openlibrary.org/b/id/${id}-${size}.jpg` : null)
const coverUrl = (doc) =>
  cover(doc.cover_i || doc.cover_id) ||
  (doc.cover_edition_key ? `https://covers.openlibrary.org/b/olid/${doc.cover_edition_key}-L.jpg` : null)

// Work keys look like "/works/OL45804W"; prefix with "ol:" so the detail
// route can tell them apart from Google volume ids.
const workId = (key) => `ol:${String(key).replace('/works/', '')}`

function normalize(doc) {
  return {
    category: 'book',
    externalId: workId(doc.key),
    title: doc.title || 'Untitled',
    posterUrl: coverUrl(doc),
    // Book covers are tall — no wide art.
    backdropUrl: null,
    year: doc.first_publish_year || null,
    rating: typeof doc.ratings_average === 'number' ? doc.ratings_average * 2 : null,
    ratingsCount: doc.ratings_count ?? null,
    overview: '',
    genreIds: (doc.subject || []).slice(0, 5),
    authors: doc.author_name || (doc.authors || []).map((a) => a.name).filter(Boolean),
    pageCount: doc.number_of_pages_median || null,
    readers: doc.want_to_read_count ?? null,
    raw: { genres: (doc.subject || []).slice(0, 5) },
  }
}

const mapDocs = (list) => (list || []).filter((d) => coverUrl(d)).map(normalize)

function searchUrl(params) {
  const q = new URLSearchParams({ limit: '24', fields: FIELDS, ...params })
  return `${OL}/search.json?${q}`
}

// "Science Fiction" -> "science_fiction" (Open Library subject slugs).
export const subjectSlug = (s) => String(s).toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

export const openLibrary = {
  trending: async (signal) => {
    try {
      const d = await fetchJson(`${OL}/trending/weekly.json?limit=30`, { signal })
      const items = mapDocs(d.works)
      if (items.length) return items
    } catch (err) {
      if (err.name === 'AbortError') throw err
    }
    // "readinglog" ≈ how many readers have it shelved.
    const d = await fetchJson(searchUrl({ q: 'subject:fiction', sort: 'readinglog' }), { signal })
    return mapDocs(d.docs)
  },
  topRated: async (signal) => {
    const d = await fetchJson(searchUrl({ q: 'subject:fiction', sort: 'rating' }), { signal })
    return mapDocs(d.docs).filter((b) => b.rating != null)
  },
  newReleases: (signal) =>
    fetchJson(searchUrl({ q: 'subject:fiction', sort: 'new' }), { signal }).then((d) => mapDocs(d.docs)),
  // Subject shelf ("fantasy", "science_fiction"…), most-shelved first.
  subject: async (name, signal) => {
    const d = await fetchJson(`${OL}/subjects/${subjectSlug(name)}.json?limit=24`, { signal })
    return mapDocs(d.works)
  },
  search: (query, signal) => fetchJson(searchUrl({ q: query }), { signal }).then((d) => mapDocs(d.docs)),
  byGenres: (genres, signal) => {
    const subject = genres[0] ? `subject:"${String(genres[0]).toLowerCase()}"` : 'subject:fiction'
    return fetchJson(searchUrl({ q: subject, sort: 'readinglog' }), { signal }).then((d) => mapDocs(d.docs))
  },
  async detail(externalId, signal) {
    const key = String(externalId).replace(/^ol:/, '')
    const work = await fetchJson(`${OL}/works/${key}.json`, { signal })

    // Ratings, authors, an edition (pages/publisher) and reader shelves live
    // on separate endpoints; fetch best-effort in parallel.
    const [ratings, authors, editions, shelves] = await Promise.all([
      fetchJson(`${OL}/works/${key}/ratings.json`, { signal }).catch(() => null),
      resolveAuthors(work.authors, signal),
      fetchJson(`${OL}/works/${key}/editions.json?limit=12`, { signal }).catch(() => null),
      fetchJson(`${OL}/works/${key}/bookshelves.json`, { signal }).catch(() => null),
    ])

    const entries = editions?.entries || []
    const withPages = entries.find((e) => e.number_of_pages) || entries[0] || {}
    const subjects = (work.subjects || []).filter((s) => s.length < 32).slice(0, 8)
    const avg = ratings?.summary?.average

    return {
      category: 'book',
      externalId,
      title: work.title || 'Untitled',
      subtitle: work.subtitle || '',
      posterUrl: cover(work.covers?.find((c) => c > 0)) || null,
      backdropUrl: null,
      year: work.first_publish_date ? Number(String(work.first_publish_date).match(/\d{4}/)?.[0]) || null : null,
      rating: typeof avg === 'number' ? avg * 2 : null,
      ratingsCount: ratings?.summary?.count ?? null,
      overview: descriptionText(work.description),
      genres: subjects,
      genreIds: subjects,
      authors,
      people: authors,
      creators: authors,
      publisher: withPages.publishers?.[0] || '',
      publishDate: withPages.publish_date || null,
      isbn: withPages.isbn_13?.[0] || withPages.isbn_10?.[0] || null,
      pageCount: withPages.number_of_pages || null,
      editionCount: editions?.size ?? null,
      shelves: shelves?.counts
        ? {
            want: shelves.counts.want_to_read ?? 0,
            reading: shelves.counts.currently_reading ?? 0,
            read: shelves.counts.already_read ?? 0,
          }
        : null,
      tagline: work.subtitle || '',
      raw: { genres: subjects },
    }
  },
}

function descriptionText(desc) {
  if (!desc) return ''
  const text = typeof desc === 'string' ? desc : desc.value || ''
  // Strip the "----------" source blocks and markdown links OL appends.
  return text.split(/\n-{3,}/)[0].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim()
}

async function resolveAuthors(authors, signal) {
  if (!Array.isArray(authors)) return []
  const keys = authors.slice(0, 3).map((a) => a.author?.key).filter(Boolean)
  const names = await Promise.all(
    keys.map((k) =>
      fetchJson(`${OL}${k}.json`, { signal })
        .then((a) => a.name)
        .catch(() => null),
    ),
  )
  return names.filter(Boolean)
}
