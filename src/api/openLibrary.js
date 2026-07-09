import { fetchJson } from './http'

// Open Library — completely free, no key, no per-project quota. Used as the
// fallback source for Books when Google Books is unavailable/quota-limited.
const SEARCH = 'https://openlibrary.org/search.json'
const FIELDS =
  'key,title,author_name,first_publish_year,cover_i,cover_edition_key,ratings_average,subject'

const coverUrl = (doc) => {
  if (doc.cover_i) return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
  if (doc.cover_edition_key)
    return `https://covers.openlibrary.org/b/olid/${doc.cover_edition_key}-L.jpg`
  return null
}

// Open Library work keys look like "/works/OL45804W". Prefix with "ol:" so the
// book detail route can tell them apart from Google volume ids.
const workId = (key) => `ol:${String(key).replace('/works/', '')}`

function normalize(doc) {
  return {
    category: 'book',
    externalId: workId(doc.key),
    title: doc.title || 'Untitled',
    posterUrl: coverUrl(doc),
    // Book covers are tall — no wide banner art exists, so keep backdrop null
    // and let the Hero render its poster treatment.
    backdropUrl: null,
    year: doc.first_publish_year || null,
    rating: typeof doc.ratings_average === 'number' ? doc.ratings_average * 2 : null,
    overview: '',
    genreIds: (doc.subject || []).slice(0, 5),
    authors: doc.author_name || [],
    raw: doc,
  }
}

const mapDocs = (data) =>
  (data.docs || []).filter((d) => coverUrl(d)).map(normalize)

function listUrl(params) {
  const q = new URLSearchParams({ limit: '24', fields: FIELDS, ...params })
  return `${SEARCH}?${q}`
}

export const openLibrary = {
  // "readinglog" sort ≈ how many readers have it shelved → a decent trending proxy.
  trending: (signal) =>
    fetchJson(listUrl({ q: 'subject:fiction', sort: 'readinglog' }), { signal }).then(mapDocs),
  topRated: async (signal) => {
    const data = await fetchJson(listUrl({ q: 'subject:fiction', sort: 'rating' }), { signal })
    return mapDocs(data).filter((b) => b.rating != null)
  },
  newReleases: (signal) =>
    fetchJson(listUrl({ q: 'subject:fiction', sort: 'new' }), { signal }).then(mapDocs),
  search: (query, signal) =>
    fetchJson(listUrl({ q: query }), { signal }).then(mapDocs),
  byGenres: (genres, signal) => {
    const subject = genres[0] ? `subject:${String(genres[0]).toLowerCase().replace(/\s+/g, '_')}` : 'subject:fiction'
    return fetchJson(listUrl({ q: subject, sort: 'readinglog' }), { signal }).then(mapDocs)
  },
  async detail(externalId, signal) {
    const key = String(externalId).replace(/^ol:/, '')
    const work = await fetchJson(`https://openlibrary.org/works/${key}.json`, { signal })

    // Ratings + author names live on separate endpoints; fetch best-effort.
    const [ratings, authors] = await Promise.all([
      fetchJson(`https://openlibrary.org/works/${key}/ratings.json`, { signal }).catch(() => null),
      resolveAuthors(work.authors, signal),
    ])

    const cover = work.covers?.[0]
      ? `https://covers.openlibrary.org/b/id/${work.covers[0]}-L.jpg`
      : null
    const subjects = (work.subjects || []).slice(0, 6)
    const avg = ratings?.summary?.average

    return {
      category: 'book',
      externalId,
      title: work.title || 'Untitled',
      posterUrl: cover,
      backdropUrl: null, // tall cover only — see normalize()
      year: work.first_publish_date ? Number(String(work.first_publish_date).slice(-4)) : null,
      rating: typeof avg === 'number' ? avg * 2 : null,
      overview: descriptionText(work.description),
      genres: subjects,
      genreIds: subjects,
      people: authors,
      creators: authors,
      publisher: '',
      pageCount: null,
      tagline: '',
      raw: work,
    }
  },
}

function descriptionText(desc) {
  if (!desc) return ''
  return typeof desc === 'string' ? desc : desc.value || ''
}

async function resolveAuthors(authors, signal) {
  if (!Array.isArray(authors)) return []
  const keys = authors.slice(0, 3).map((a) => a.author?.key).filter(Boolean)
  const names = await Promise.all(
    keys.map((k) =>
      fetchJson(`https://openlibrary.org${k}.json`, { signal })
        .then((a) => a.name)
        .catch(() => null),
    ),
  )
  return names.filter(Boolean)
}
