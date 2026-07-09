import { fetchJson, requireKey } from './http'

// YouTube Data API v3 — for tracking podcasts & video essays. Requires a key.
// Discovery is biased toward long-form content (essays/podcasts) rather than
// generic trending clips.
const KEY = import.meta.env.VITE_YOUTUBE_API_KEY
const BASE = 'https://www.googleapis.com/youtube/v3'

function url(path, params) {
  requireKey(KEY, 'YouTube')
  const q = new URLSearchParams({ key: KEY, ...params })
  return `${BASE}/${path}?${q}`
}

// YouTube titles/descriptions arrive HTML-escaped.
const decode = (s = '') =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))

// ISO-8601 duration (PT1H2M3S) → whole minutes.
function durationToMinutes(iso) {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || '')
  if (!m) return null
  return Math.round((+(m[1] || 0)) * 60 + +(m[2] || 0) + +(m[3] || 0) / 60)
}

// search results nest the id as { videoId }; the videos endpoint returns a string.
const videoId = (item) => (typeof item.id === 'string' ? item.id : item.id?.videoId)

// Topics we don't want surfacing as "essays/podcasts". Two uses:
//  - appended as -negative terms to the search query (server-side filtering)
//  - matched against title/description to drop stragglers (client-side)
const BLOCK_TERMS = [
  'news',
  'breaking',
  'live',
  'reaction',
  'shorts',
  'trailer',
  'ai',
  'chatgpt',
  'openai',
  'crypto',
  'nft',
  'stock',
  'trading',
  'gameplay',
  'unboxing',
  'tutorial',
  'highlights',
]

// -"multi word" for phrases, -word for single terms.
const NEGATIVE_QUERY = BLOCK_TERMS.map((t) => (t.includes(' ') ? `-"${t}"` : `-${t}`)).join(' ')

const blockRe = new RegExp(`\\b(${BLOCK_TERMS.join('|')})\\b`, 'i')

// Drop anything whose title or description trips the blocklist.
const isInteresting = (v) => !blockRe.test(`${v.title} ${v.overview}`)

function normalize(item) {
  const sn = item.snippet || {}
  const t = sn.thumbnails || {}
  const channel = sn.channelTitle || ''
  return {
    category: 'youtube',
    externalId: videoId(item),
    title: decode(sn.title || 'Untitled'),
    // Thumbnails are 16:9; the poster grid crops them to 2:3 (centered).
    posterUrl: (t.high || t.medium || t.default)?.url || null,
    backdropUrl: (t.maxres || t.high || t.medium)?.url || null,
    year: sn.publishedAt ? Number(sn.publishedAt.slice(0, 4)) : null,
    rating: null, // YouTube has no 0-10 rating
    overview: decode(sn.description || ''),
    // Store the channel as the "genre" so recommendations = more from channels
    // you already track.
    genreIds: channel ? [channel] : [],
    channelTitle: channel,
    raw: { ...item, genres: channel ? [channel] : [] },
  }
}

const mapList = (data) =>
  (data.items || []).filter((i) => videoId(i) && i.snippet?.thumbnails).map(normalize)

function search(q, { order = 'relevance', videoDuration, filter = true } = {}, signal) {
  return fetchJson(
    url('search', {
      part: 'snippet',
      type: 'video',
      // Ask for extra since the post-filter trims some out.
      maxResults: '40',
      q: filter ? `${q} ${NEGATIVE_QUERY}` : q,
      order,
      // Bias toward English results (kills most of the Spanish bleed-through).
      relevanceLanguage: 'en',
      regionCode: 'US',
      ...(videoDuration ? { videoDuration } : {}),
    }),
    { signal },
  ).then(mapList).then((list) => (filter ? list.filter(isInteresting) : list))
}

// ---- Curated channels -------------------------------------------------------
// The discovery rows are driven by these creators rather than blind keyword
// search — this is what makes results actually "interesting" (and English).
// Add/remove the @handle straight from a channel's URL (youtube.com/@handle).
const CURATED = [
  '@LEMMiNO',
  '@fern-tv',
  '@Historically',
  '@ThomasFlight',
  '@NerdwriterMovies',
  '@Polyphonic',
]

// Resolve a @handle to its "uploads" playlist ID, cached for the session.
// A channel's uploads playlist is its channelId with the UC prefix → UU.
const uploadsCache = new Map()
async function uploadsPlaylist(handle, signal) {
  if (uploadsCache.has(handle)) return uploadsCache.get(handle)
  const name = handle.replace(/^@/, '')
  let id = null
  try {
    // Exact handle lookup first.
    const data = await fetchJson(url('channels', { part: 'contentDetails', forHandle: name }), { signal })
    id = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads || null
  } catch {
    /* fall through to search */
  }
  if (!id) {
    // Fallback: search by name and derive the uploads playlist from channelId.
    const data = await fetchJson(
      url('search', { part: 'snippet', type: 'channel', maxResults: '1', q: name }),
      { signal },
    )
    const chId = data.items?.[0]?.id?.channelId
    if (chId) id = `UU${chId.slice(2)}`
  }
  uploadsCache.set(handle, id)
  return id
}

// Recent uploads from one channel.
async function channelUploads(handle, signal) {
  const playlistId = await uploadsPlaylist(handle, signal)
  if (!playlistId) return []
  const data = await fetchJson(
    url('playlistItems', { part: 'snippet,contentDetails', playlistId, maxResults: '10' }),
    { signal },
  )
  return (data.items || [])
    .map((it) => ({ id: it.contentDetails?.videoId || it.snippet?.resourceId?.videoId, snippet: it.snippet }))
    .filter((it) => it.id && it.snippet?.thumbnails)
    .map(normalize)
}

const publishedAt = (v) => v.raw?.snippet?.publishedAt || ''

// Merge recent uploads across all curated channels, newest first, deduped.
async function curatedRecent(signal, { limit = 24 } = {}) {
  const lists = await Promise.all(CURATED.map((h) => channelUploads(h, signal).catch(() => [])))
  const seen = new Set()
  const merged = []
  for (const v of lists.flat()) {
    if (v.externalId && !seen.has(v.externalId)) {
      seen.add(v.externalId)
      merged.push(v)
    }
  }
  merged.sort((a, b) => publishedAt(b).localeCompare(publishedAt(a)))
  return merged.slice(0, limit)
}

// Same pool, ranked by view count (one batched stats call).
async function curatedTopRated(signal) {
  const pool = await curatedRecent(signal, { limit: 50 })
  const ids = pool.map((v) => v.externalId)
  if (!ids.length) return []
  const data = await fetchJson(url('videos', { part: 'statistics', id: ids.join(',') }), { signal })
  const views = new Map((data.items || []).map((it) => [it.id, Number(it.statistics?.viewCount) || 0]))
  return pool.sort((a, b) => (views.get(b.externalId) || 0) - (views.get(a.externalId) || 0)).slice(0, 24)
}

export const youtube = {
  // Hero + "New Releases": freshest uploads from the curated essay channels.
  newReleases: (signal) => curatedRecent(signal),
  // Trending: most-viewed English podcasts (keeps some variety beyond essays).
  trending: (signal) => search('podcast', { order: 'viewCount', videoDuration: 'long' }, signal),
  // Top Rated: most-viewed videos from the curated channels.
  topRated: (signal) => curatedTopRated(signal),
  // Explicit search returns exactly what the user asked for (no blocklist).
  search: (query, signal) => search(query, { order: 'relevance', filter: false }, signal),
  // Recommendations by channel name (see genreIds above).
  byGenres: (genres, signal) =>
    genres.length ? search(genres.join(' '), { order: 'relevance' }, signal) : Promise.resolve([]),
  async detail(id, signal) {
    const data = await fetchJson(
      url('videos', { part: 'snippet,contentDetails,statistics', id }),
      { signal },
    )
    const item = data.items?.[0]
    if (!item) throw new Error('Video not found')
    const base = normalize(item)
    const sn = item.snippet || {}
    const views = Number(item.statistics?.viewCount)
    return {
      ...base,
      genres: (sn.tags || []).slice(0, 6),
      runtime: durationToMinutes(item.contentDetails?.duration),
      people: sn.channelTitle ? [sn.channelTitle] : [],
      creators: sn.channelTitle ? [sn.channelTitle] : [],
      publisher: sn.channelTitle || '',
      views: Number.isFinite(views) ? views : null,
      tagline: '',
    }
  },
}
