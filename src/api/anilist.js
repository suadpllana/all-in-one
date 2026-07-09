import { ApiError } from './http'

// AniList GraphQL — used as a fallback for the anime category when Jikan is
// rate-limited or down. More generous rate limits, no API key.
const ENDPOINT = 'https://graphql.anilist.co'

const MEDIA_FIELDS = `
  id
  title { english romaji }
  coverImage { large extraLarge }
  bannerImage
  averageScore
  seasonYear
  description(asHtml: false)
  genres
  episodes
  duration
  studios(isMain: true) { nodes { name } }
`

async function gql(query, variables, signal) {
  let res
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError('Network error reaching AniList.', { code: 'network' })
  }
  if (res.status === 429) {
    throw new ApiError('AniList rate limited.', { status: 429, code: 'rate_limited' })
  }
  if (!res.ok) throw new ApiError(`AniList request failed (${res.status}).`, { code: 'http' })
  const json = await res.json()
  if (json.errors) throw new ApiError(json.errors[0]?.message || 'AniList error.', { code: 'http' })
  return json.data
}

const strip = (html) => (html ? html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '')

function normalize(m) {
  return {
    category: 'anime',
    externalId: `al:${m.id}`, // prefix so it never collides with Jikan mal ids
    title: m.title?.english || m.title?.romaji || 'Untitled',
    posterUrl: m.coverImage?.extraLarge || m.coverImage?.large || null,
    backdropUrl: m.bannerImage || null,
    year: m.seasonYear || null,
    rating: typeof m.averageScore === 'number' ? m.averageScore / 10 : null,
    overview: strip(m.description),
    genreIds: m.genres || [],
    raw: m,
  }
}

const PAGE = (sort, extra = '') => `
  query ($perPage: Int) {
    Page(perPage: $perPage) {
      media(type: ANIME, sort: ${sort}, ${extra}) { ${MEDIA_FIELDS} }
    }
  }`

async function page(query, signal) {
  const data = await gql(query, { perPage: 20 }, signal)
  return (data.Page.media || []).map(normalize)
}

export const anilist = {
  trending: (signal) => page(PAGE('TRENDING_DESC'), signal),
  topRated: (signal) => page(PAGE('SCORE_DESC'), signal),
  newReleases: (signal) => page(PAGE('START_DATE_DESC', 'status_in: [RELEASING, FINISHED]'), signal),
  async search(query, signal) {
    const data = await gql(
      `query ($q: String, $perPage: Int) {
        Page(perPage: $perPage) { media(type: ANIME, search: $q, sort: SEARCH_MATCH) { ${MEDIA_FIELDS} } }
      }`,
      { q: query, perPage: 20 },
      signal,
    )
    return (data.Page.media || []).map(normalize)
  },
  async byGenres(genres, signal) {
    const data = await gql(
      `query ($genres: [String], $perPage: Int) {
        Page(perPage: $perPage) { media(type: ANIME, genre_in: $genres, sort: POPULARITY_DESC) { ${MEDIA_FIELDS} } }
      }`,
      { genres, perPage: 20 },
      signal,
    )
    return (data.Page.media || []).map(normalize)
  },
  async detail(externalId, signal) {
    const id = Number(String(externalId).replace(/^al:/, ''))
    const data = await gql(
      `query ($id: Int) { Media(id: $id, type: ANIME) { ${MEDIA_FIELDS} } }`,
      { id },
      signal,
    )
    const base = normalize(data.Media)
    return {
      ...base,
      genres: data.Media.genres || [],
      runtime: data.Media.duration || null,
      episodes: data.Media.episodes || null,
      people: [],
      creators: (data.Media.studios?.nodes || []).map((s) => s.name).slice(0, 3),
    }
  },
}
