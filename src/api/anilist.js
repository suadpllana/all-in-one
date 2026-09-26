import { ApiError } from './http'

// AniList GraphQL — primary source for anime: wide banner art, cover
// colours, airing countdowns, characters and trailers, no API key. Items keep
// their MyAnimeList id as externalId when AniList knows it (idMal), so they
// match library entries saved from Jikan; otherwise "al:<id>".
const ENDPOINT = 'https://graphql.anilist.co'

const FIELDS = `
  id
  idMal
  title { english romaji native }
  coverImage { extraLarge large color }
  bannerImage
  averageScore
  meanScore
  popularity
  favourites
  season
  seasonYear
  format
  status
  episodes
  duration
  genres
  source(version: 3)
  description(asHtml: false)
  startDate { year month day }
  studios(isMain: true) { nodes { name } }
  nextAiringEpisode { episode airingAt timeUntilAiring }
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
    throw new ApiError('AniList is rate limiting requests — try again in a minute.', { status: 429, code: 'rate_limited' })
  }
  let json = null
  try {
    json = await res.json()
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok || json?.errors) {
    throw new ApiError(json?.errors?.[0]?.message || `AniList request failed (${res.status}).`, {
      status: res.status,
      code: 'http',
    })
  }
  return json.data
}

// Descriptions arrive with <br>/<i> tags and source credits.
const clean = (html) =>
  html
    ? html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\((Source|Written by)[^)]*\)\s*$/i, '')
        .replace(/\[Written by[^\]]*\]\s*$/i, '')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&#039;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    : ''

export function normalize(m) {
  return {
    category: 'anime',
    externalId: m.idMal ? String(m.idMal) : `al:${m.id}`,
    anilistId: m.id,
    malId: m.idMal ?? null,
    title: m.title?.english || m.title?.romaji || 'Untitled',
    titleRomaji: m.title?.romaji || null,
    titleNative: m.title?.native || null,
    posterUrl: m.coverImage?.extraLarge || m.coverImage?.large || null,
    backdropUrl: m.bannerImage || null,
    color: m.coverImage?.color || null,
    year: m.seasonYear || m.startDate?.year || null,
    rating: m.averageScore != null ? m.averageScore / 10 : m.meanScore != null ? m.meanScore / 10 : null,
    popularity: m.popularity ?? null,
    favourites: m.favourites ?? null,
    overview: clean(m.description),
    genreIds: m.genres || [],
    episodes: m.episodes || null,
    runtime: m.duration || null,
    format: m.format || null,
    airingStatus: m.status || null,
    season: m.season || null,
    source: m.source || null,
    studios: (m.studios?.nodes || []).map((s) => s.name),
    nextAiring: m.nextAiringEpisode
      ? {
          episode: m.nextAiringEpisode.episode,
          airingAt: m.nextAiringEpisode.airingAt * 1000,
          timeUntil: m.nextAiringEpisode.timeUntilAiring,
        }
      : null,
    raw: { genres: m.genres || [] },
  }
}

// GraphQL rejects declared-but-unused variables, so declare only the ones
// this query's arguments reference.
const VAR_TYPES = { season: 'MediaSeason', year: 'Int', search: 'String', genres: '[String]' }
function pageQuery(args) {
  const used = [...new Set([...args.matchAll(/\$(\w+)/g)].map((m) => m[1]))]
  const decls = ['$perPage: Int', '$page: Int', ...used.map((v) => `$${v}: ${VAR_TYPES[v]}`)].join(', ')
  return `
  query (${decls}) {
    Page(perPage: $perPage, page: $page) {
      pageInfo { hasNextPage currentPage }
      media(type: ANIME, isAdult: false, ${args}) { ${FIELDS} }
    }
  }`
}

async function page(args, variables = {}, signal) {
  const data = await gql(pageQuery(args), { perPage: 20, page: 1, ...variables }, signal)
  return (data.Page.media || []).map(normalize)
}

// Anime seasons follow the calendar quarter.
export function currentSeason(date = new Date()) {
  const m = date.getMonth()
  const season = m < 3 ? 'WINTER' : m < 6 ? 'SPRING' : m < 9 ? 'SUMMER' : 'FALL'
  return { season, year: date.getFullYear() }
}
const ORDER = ['WINTER', 'SPRING', 'SUMMER', 'FALL']
export function shiftSeason({ season, year }, delta) {
  const i = ORDER.indexOf(season) + delta
  return { season: ORDER[((i % 4) + 4) % 4], year: year + Math.floor(i / 4) }
}

const DETAIL = `
  query ($id: Int, $idMal: Int) {
    Media(id: $id, idMal: $idMal, type: ANIME) {
      ${FIELDS}
      endDate { year month day }
      trailer { id site }
      tags { name rank isMediaSpoiler }
      rankings { rank type allTime context season year }
      externalLinks { site url type }
      characters(sort: [ROLE, RELEVANCE, ID], perPage: 12) {
        edges {
          role
          node { id name { full } image { large } }
          voiceActors(language: JAPANESE, sort: [RELEVANCE, ID]) { id name { full } image { large } }
        }
      }
      relations {
        edges {
          relationType(version: 2)
          node { id idMal type format title { english romaji } coverImage { large } }
        }
      }
      recommendations(sort: [RATING_DESC, ID], perPage: 12) {
        nodes { mediaRecommendation { ${FIELDS} } }
      }
    }
  }`

const RELATION_LABELS = {
  SEQUEL: 'Sequel',
  PREQUEL: 'Prequel',
  SIDE_STORY: 'Side story',
  PARENT: 'Parent story',
  SPIN_OFF: 'Spin-off',
  ALTERNATIVE: 'Alternative',
  ADAPTATION: 'Adaptation',
  SOURCE: 'Source',
  SUMMARY: 'Summary',
  COMPILATION: 'Compilation',
  CONTAINS: 'Contains',
  CHARACTER: 'Shared characters',
  OTHER: 'Related',
}

export const anilist = {
  trending: (signal) => page('sort: TRENDING_DESC', {}, signal),
  topRated: (signal) => page('sort: SCORE_DESC', {}, signal),
  popular: (signal) => page('sort: POPULARITY_DESC', {}, signal),
  newReleases: (signal) => {
    const s = currentSeason()
    return page('season: $season, seasonYear: $year, sort: POPULARITY_DESC', { season: s.season, year: s.year }, signal)
  },
  season: ({ season, year }, signal) =>
    page('season: $season, seasonYear: $year, sort: POPULARITY_DESC', { season, year, perPage: 36 }, signal),
  search: (query, signal) => page('search: $search, sort: SEARCH_MATCH', { search: query }, signal),
  byGenres: (genres, signal) => page('genre_in: $genres, sort: POPULARITY_DESC', { genres }, signal),

  // Episodes airing between two unix times (seconds), soonest first.
  async schedule({ start, end }, signal) {
    const q = `
      query ($start: Int, $end: Int, $page: Int) {
        Page(page: $page, perPage: 50) {
          pageInfo { hasNextPage }
          airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
            id episode airingAt
            media { ${FIELDS} isAdult countryOfOrigin }
          }
        }
      }`
    const out = []
    for (let p = 1; p <= 3; p++) {
      const data = await gql(q, { start, end, page: p }, signal)
      for (const s of data.Page.airingSchedules || []) {
        if (!s.media || s.media.isAdult || s.media.countryOfOrigin !== 'JP') continue
        out.push({ id: s.id, episode: s.episode, airingAt: s.airingAt * 1000, item: normalize(s.media) })
      }
      if (!data.Page.pageInfo?.hasNextPage) break
    }
    return out
  },

  // Fresh airing info (next episode, total episodes) for library entries,
  // in one request. Aliased pages are only included for non-empty id lists
  // (an empty *_in filter would match everything).
  async airing(externalIds, signal) {
    const mal = externalIds.filter((id) => !String(id).startsWith('al:')).map(Number).filter(Boolean)
    const al = externalIds.filter((id) => String(id).startsWith('al:')).map((id) => Number(String(id).slice(3)))
    if (!mal.length && !al.length) return {}
    const fields = 'id idMal episodes status nextAiringEpisode { episode airingAt timeUntilAiring }'
    const decls = [mal.length && '$mal: [Int]', al.length && '$al: [Int]'].filter(Boolean).join(', ')
    const q = `query (${decls}) {
      ${mal.length ? `byMal: Page(perPage: 50) { media(idMal_in: $mal, type: ANIME) { ${fields} } }` : ''}
      ${al.length ? `byId: Page(perPage: 50) { media(id_in: $al, type: ANIME) { ${fields} } }` : ''}
    }`
    const data = await gql(q, { ...(mal.length && { mal }), ...(al.length && { al }) }, signal)
    const out = {}
    for (const m of [...(data.byMal?.media || []), ...(data.byId?.media || [])]) {
      const key = m.idMal && mal.includes(m.idMal) ? String(m.idMal) : `al:${m.id}`
      out[key] = {
        episodes: m.episodes || null,
        airingStatus: m.status,
        nextAiring: m.nextAiringEpisode
          ? { episode: m.nextAiringEpisode.episode, airingAt: m.nextAiringEpisode.airingAt * 1000, timeUntil: m.nextAiringEpisode.timeUntilAiring }
          : null,
      }
    }
    return out
  },

  async detail(externalId, signal) {
    const raw = String(externalId)
    const vars = raw.startsWith('al:') ? { id: Number(raw.slice(3)) } : { idMal: Number(raw) }
    const data = await gql(DETAIL, vars, signal)
    const m = data.Media
    if (!m) throw new ApiError('Anime not found.', { code: 'http', status: 404 })
    const base = normalize(m)
    return {
      ...base,
      // Keep the id the page was opened with so library lookups match.
      externalId: raw,
      genres: m.genres || [],
      endDate: m.endDate?.year ? m.endDate : null,
      startDate: m.startDate?.year ? m.startDate : null,
      trailerKey: m.trailer?.site === 'youtube' ? m.trailer.id : null,
      tags: (m.tags || []).filter((t) => !t.isMediaSpoiler && t.rank >= 60).slice(0, 8).map((t) => t.name),
      rankings: (m.rankings || [])
        .filter((r) => r.allTime || r.season)
        .slice(0, 3)
        .map((r) => ({
          rank: r.rank,
          type: r.type,
          label: r.allTime
            ? `${r.type === 'RATED' ? 'Highest rated' : 'Most popular'} all time`
            : `${r.type === 'RATED' ? 'Highest rated' : 'Most popular'} ${r.season ? r.season.toLowerCase() : ''} ${r.year || ''}`.trim(),
        })),
      streaming: (m.externalLinks || []).filter((l) => l.type === 'STREAMING').map((l) => ({ site: l.site, url: l.url })),
      characters: (m.characters?.edges || []).map((e) => ({
        name: e.node?.name?.full,
        image: e.node?.image?.large,
        role: e.role === 'MAIN' ? 'Main' : 'Supporting',
        va: e.voiceActors?.[0] ? { name: e.voiceActors[0].name?.full, image: e.voiceActors[0].image?.large } : null,
      })),
      relations: (m.relations?.edges || [])
        .filter((e) => e.node)
        .map((e) => ({
          relation: RELATION_LABELS[e.relationType] || 'Related',
          title: e.node.title?.english || e.node.title?.romaji,
          format: e.node.format,
          type: e.node.type,
          posterUrl: e.node.coverImage?.large,
          externalId: e.node.type === 'ANIME' ? (e.node.idMal ? String(e.node.idMal) : `al:${e.node.id}`) : null,
        })),
      recommendations: (m.recommendations?.nodes || [])
        .map((n) => n.mediaRecommendation)
        .filter(Boolean)
        .map(normalize),
      creators: base.studios.slice(0, 3),
      people: [],
    }
  },
}
