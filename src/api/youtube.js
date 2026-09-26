import { fetchJson, requireKey } from './http'

// YouTube Data API v3 — long-form video essays & podcasts. Requires a key.
// Quota-aware: search costs 100 units, everything else here costs 1, so
// discovery is driven by curated channels' upload playlists and details
// (durations, views, channel avatars) are fetched in batches of 50.
const KEY = import.meta.env.VITE_YOUTUBE_API_KEY
const BASE = 'https://www.googleapis.com/youtube/v3'

function url(path, params) {
  requireKey(KEY, 'YouTube')
  const q = new URLSearchParams({ key: KEY, ...params })
  return `${BASE}/${path}?${q}`
}

// Titles/descriptions arrive HTML-escaped.
const decode = (s) =>
  (s || '')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))

// ISO-8601 duration (PT1H2M3S) → seconds.
function isoSeconds(iso) {
  const m = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || '')
  if (!m) return null
  return (+(m[1] || 0)) * 86400 + (+(m[2] || 0)) * 3600 + (+(m[3] || 0)) * 60 + +(m[4] || 0)
}

// 3725 → "1:02:05", 754 → "12:34" (the video-platform format).
export function clock(sec) {
  if (sec == null) return null
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

// search results nest the id as { videoId }; the videos endpoint returns a string.
const videoId = (item) => (typeof item.id === 'string' ? item.id : item.id?.videoId)

// Topics that shouldn't surface as "essays/podcasts" in open searches.
const BLOCK_TERMS = [
  'news', 'breaking', 'live', 'reaction', 'shorts', 'trailer', 'ai', 'chatgpt', 'openai', 'crypto', 'nft',
  'stock', 'trading', 'gameplay', 'unboxing', 'tutorial', 'highlights',
]
const NEGATIVE_QUERY = BLOCK_TERMS.map((t) => `-${t}`).join(' ')
const blockRe = new RegExp(`\\b(${BLOCK_TERMS.join('|')})\\b`, 'i')
const isInteresting = (v) => !blockRe.test(`${v.title} ${v.overview}`)

function normalize(item) {
  const sn = item.snippet || {}
  const t = sn.thumbnails || {}
  const channel = sn.channelTitle || ''
  return {
    category: 'youtube',
    externalId: videoId(item),
    title: decode(sn.title || 'Untitled'),
    // `high` is 4:3 with letterbox bars; 16:9 cards crop them away.
    posterUrl: (t.high || t.medium || t.default)?.url || null,
    backdropUrl: (t.maxres || t.standard || t.high || t.medium)?.url || null,
    year: sn.publishedAt ? Number(sn.publishedAt.slice(0, 4)) : null,
    publishedAt: sn.publishedAt || null,
    rating: null, // YouTube has no 0-10 rating
    overview: decode(sn.description || ''),
    // The channel doubles as the "genre" so recommendations = more from
    // channels you already track.
    genreIds: channel ? [channel] : [],
    channelTitle: channel,
    channelId: sn.channelId || null,
    tags: sn.tags || [],
    raw: { genres: channel ? [channel] : [] },
  }
}

const mapList = (data) => (data.items || []).filter((i) => videoId(i) && i.snippet?.thumbnails).map(normalize)

// ---- Channels -----------------------------------------------------------
const channelCache = new Map() // channelId -> { id, title, handle, avatar, subs, uploads }

function toChannel(c) {
  const meta = {
    id: c.id,
    title: c.snippet?.title || '',
    handle: c.snippet?.customUrl || null,
    avatar: (c.snippet?.thumbnails?.medium || c.snippet?.thumbnails?.default)?.url || null,
    subs: c.statistics?.hiddenSubscriberCount ? null : Number(c.statistics?.subscriberCount) || null,
    videoCount: Number(c.statistics?.videoCount) || null,
    uploads: c.contentDetails?.relatedPlaylists?.uploads || (c.id ? `UU${c.id.slice(2)}` : null),
  }
  channelCache.set(c.id, meta)
  return meta
}

async function channelsById(ids, signal) {
  const missing = [...new Set(ids)].filter((id) => id && !channelCache.has(id))
  for (let i = 0; i < missing.length; i += 50) {
    const data = await fetchJson(
      url('channels', { part: 'snippet,statistics,contentDetails', id: missing.slice(i, i + 50).join(','), maxResults: '50' }),
      { signal },
    )
    ;(data.items || []).forEach(toChannel)
  }
  return ids.map((id) => channelCache.get(id)).filter(Boolean)
}

// Batch-fill durations, view counts and channel avatars (1 unit per 50).
// Drops Shorts (< 90s) since this world is about long-form.
async function enrich(items, signal, { dropShorts = true } = {}) {
  if (!items.length) return items
  const ids = items.map((v) => v.externalId)
  const stats = new Map()
  for (let i = 0; i < ids.length; i += 50) {
    const data = await fetchJson(
      url('videos', { part: 'contentDetails,statistics', id: ids.slice(i, i + 50).join(','), maxResults: '50' }),
      { signal },
    ).catch(() => ({ items: [] }))
    for (const v of data.items || []) stats.set(v.id, v)
  }
  await channelsById(items.map((v) => v.channelId).filter(Boolean), signal).catch(() => [])
  return items
    .map((v) => {
      const s = stats.get(v.externalId)
      const sec = isoSeconds(s?.contentDetails?.duration)
      const ch = channelCache.get(v.channelId)
      return {
        ...v,
        durationSec: sec,
        durationLabel: clock(sec),
        runtime: sec != null ? Math.max(1, Math.round(sec / 60)) : null,
        views: s ? Number(s.statistics?.viewCount) || 0 : null,
        likes: s ? Number(s.statistics?.likeCount) || null : null,
        channelAvatar: ch?.avatar || null,
      }
    })
    .filter((v) => !dropShorts || v.durationSec == null || v.durationSec >= 90)
}

function search(q, { order = 'relevance', videoDuration, filter = true, max = 30 } = {}, signal) {
  return fetchJson(
    url('search', {
      part: 'snippet',
      type: 'video',
      maxResults: String(max),
      q: filter ? `${q} ${NEGATIVE_QUERY}` : q,
      order,
      // Bias toward English results.
      relevanceLanguage: 'en',
      regionCode: 'US',
      ...(videoDuration ? { videoDuration } : {}),
    }),
    { signal },
  )
    .then(mapList)
    .then((list) => (filter ? list.filter(isInteresting) : list))
    .then((list) => enrich(list, signal))
}

// ---- Curated channels ---------------------------------------------------
// Discovery rows are driven by these creators rather than blind keyword
// search — that's what keeps them interesting (and English). Add/remove the
// @handle straight from a channel's URL (youtube.com/@handle).
export const CURATED = ['@LEMMiNO', '@fern-tv', '@Historically', '@ThomasFlight', '@NerdwriterMovies', '@Polyphonic']

const handleCache = new Map() // handle -> channel meta
async function channelForHandle(handle, signal) {
  if (handleCache.has(handle)) return handleCache.get(handle)
  const name = handle.replace(/^@/, '')
  let meta = null
  try {
    const data = await fetchJson(url('channels', { part: 'snippet,statistics,contentDetails', forHandle: name }), { signal })
    if (data.items?.[0]) meta = toChannel(data.items[0])
  } catch {
    /* fall through to search */
  }
  if (!meta) {
    const data = await fetchJson(url('search', { part: 'snippet', type: 'channel', maxResults: '1', q: name }), { signal })
    const chId = data.items?.[0]?.id?.channelId
    if (chId) meta = (await channelsById([chId], signal))[0] || { id: chId, title: name, uploads: `UU${chId.slice(2)}` }
  }
  handleCache.set(handle, meta)
  return meta
}

async function playlistVideos(playlistId, signal, max = 12) {
  if (!playlistId) return []
  const data = await fetchJson(url('playlistItems', { part: 'snippet,contentDetails', playlistId, maxResults: String(max) }), {
    signal,
  })
  return (data.items || [])
    .map((it) => ({ id: it.contentDetails?.videoId || it.snippet?.resourceId?.videoId, snippet: it.snippet }))
    .filter((it) => it.id && it.snippet?.thumbnails)
    .map(normalize)
}

const byNewest = (a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || '')

// Recent uploads across all curated channels, newest first, deduped.
async function curatedPool(signal, perChannel = 10) {
  const channels = await Promise.all(CURATED.map((h) => channelForHandle(h, signal).catch(() => null)))
  const lists = await Promise.all(
    channels.filter(Boolean).map((c) => playlistVideos(c.uploads, signal, perChannel).catch(() => [])),
  )
  const seen = new Set()
  return lists
    .flat()
    .filter((v) => v.externalId && !seen.has(v.externalId) && seen.add(v.externalId))
    .sort(byNewest)
}

export const youtube = {
  // Freshest uploads from the curated essay channels.
  newReleases: async (signal) => enrich((await curatedPool(signal)).slice(0, 30), signal).then((l) => l.slice(0, 24)),
  // Most-viewed English long-form podcasts.
  trending: (signal) => search('podcast', { order: 'viewCount', videoDuration: 'long' }, signal),
  // The curated pool ranked by views.
  topRated: async (signal) => {
    const pool = await enrich((await curatedPool(signal)).slice(0, 50), signal)
    return pool.sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 24)
  },
  // The curated creators themselves (avatars, subscriber counts).
  creators: async (signal) => (await Promise.all(CURATED.map((h) => channelForHandle(h, signal).catch(() => null)))).filter(Boolean),
  // Explicit search returns exactly what was asked for (no blocklist).
  search: (query, signal) => search(query, { order: 'relevance', filter: false, max: 24 }, signal),
  // Recommendations by channel name (see genreIds above).
  byGenres: (genres, signal) =>
    genres.length ? search(genres.slice(0, 2).join(' '), { order: 'relevance' }, signal) : Promise.resolve([]),
  fromChannel: async (channelId, signal) => {
    const [ch] = await channelsById([channelId], signal)
    const list = await playlistVideos(ch?.uploads || `UU${channelId.slice(2)}`, signal, 16)
    return enrich(list, signal)
  },
  async detail(id, signal) {
    const data = await fetchJson(url('videos', { part: 'snippet,contentDetails,statistics', id }), { signal })
    const item = data.items?.[0]
    if (!item) throw new Error('Video not found')
    const base = normalize(item)
    const sn = item.snippet || {}
    const sec = isoSeconds(item.contentDetails?.duration)
    const [channel] = await channelsById([sn.channelId], signal).catch(() => [])
    return {
      ...base,
      genres: (sn.tags || []).slice(0, 8),
      durationSec: sec,
      durationLabel: clock(sec),
      runtime: sec != null ? Math.max(1, Math.round(sec / 60)) : null,
      views: Number(item.statistics?.viewCount) || null,
      likes: Number(item.statistics?.likeCount) || null,
      comments: Number(item.statistics?.commentCount) || null,
      channel: channel || null,
      channelAvatar: channel?.avatar || null,
      people: sn.channelTitle ? [sn.channelTitle] : [],
      creators: sn.channelTitle ? [sn.channelTitle] : [],
      publisher: sn.channelTitle || '',
      tagline: '',
    }
  },
}
