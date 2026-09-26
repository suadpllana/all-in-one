import { fetchJson, requireKey } from './http'

// RAWG — largest free games database. Requires an API key.
const KEY = import.meta.env.VITE_RAWG_API_KEY
const BASE = 'https://api.rawg.io/api'

function url(path, params = {}) {
  requireKey(KEY, 'RAWG')
  const q = new URLSearchParams({ key: KEY, page_size: '20', ...params })
  return `${BASE}${path}?${q}`
}

const isoDay = (offsetDays = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

// RAWG serves full-size art (often several MB). Its CDN also serves resized
// copies under /media/resize/<w>/-/; cards use those and <Img fallbackSrc>
// drops back to the original if a resized copy isn't available.
export const rawgThumb = (src, w = 640) =>
  src && src.includes('media.rawg.io/media/') && !/\/media\/(resize|crop)\//.test(src)
    ? src.replace('media.rawg.io/media/', `media.rawg.io/media/resize/${w}/-/`)
    : src

function normalize(g) {
  const shots = (g.short_screenshots || []).map((s) => s.image).filter(Boolean)
  return {
    category: 'game',
    externalId: String(g.id),
    title: g.name || 'Untitled',
    posterUrl: g.background_image || null,
    backdropUrl: g.background_image || null,
    // Screenshots power the hover-scrub on cards and the hero's HD fallback.
    backdropAlts: shots.filter((u) => u !== g.background_image),
    year: g.released ? Number(String(g.released).slice(0, 4)) : null,
    releaseDate: g.released || null,
    tba: Boolean(g.tba),
    metacritic: typeof g.metacritic === 'number' ? g.metacritic : null,
    // App-wide 0-10 score: Metacritic when present, else RAWG's 0-5 users.
    rating:
      typeof g.metacritic === 'number'
        ? g.metacritic / 10
        : typeof g.rating === 'number' && g.rating > 0
          ? g.rating * 2
          : null,
    userRating: typeof g.rating === 'number' && g.rating > 0 ? g.rating : null,
    ratingsCount: g.ratings_count ?? null,
    overview: g.description_raw || '',
    genreIds: (g.genres || []).map((x) => x.slug),
    genreNames: (g.genres || []).map((x) => x.name),
    platforms: (g.parent_platforms || []).map((p) => p.platform?.slug).filter(Boolean),
    esrb: g.esrb_rating?.name || null,
    // Average hours to finish.
    playtime: g.playtime || null,
    raw: { genres: (g.genres || []).map((x) => x.slug) },
  }
}

const mapList = (data) => (data.results || []).filter((g) => g.background_image).map(normalize)

// `platform` is a RAWG parent_platforms id list ("1", "4,8") or null.
const withPlatform = (params, platform) => (platform ? { ...params, parent_platforms: platform } : params)

export const rawg = {
  trending: (signal, { platform } = {}) =>
    fetchJson(url('/games', withPlatform({ dates: `${isoDay(-90)},${isoDay()}`, ordering: '-added' }, platform)), {
      signal,
    }).then(mapList),
  topRated: (signal, { platform } = {}) =>
    fetchJson(url('/games', withPlatform({ ordering: '-metacritic', metacritic: '85,100' }, platform)), { signal }).then(
      mapList,
    ),
  newReleases: (signal, { platform } = {}) =>
    fetchJson(url('/games', withPlatform({ dates: `${isoDay(-120)},${isoDay()}`, ordering: '-released' }, platform)), {
      signal,
    }).then(mapList),
  // Most-anticipated upcoming releases.
  upcoming: (signal, { platform } = {}) =>
    fetchJson(url('/games', withPlatform({ dates: `${isoDay(1)},${isoDay(365)}`, ordering: '-added' }, platform)), {
      signal,
    }).then(mapList),
  byGenre: (slug, signal, { platform, page = 1 } = {}) =>
    fetchJson(url('/games', withPlatform({ genres: slug, ordering: '-added', page: String(page) }, platform)), {
      signal,
    }).then((d) => ({ items: mapList(d), page, totalPages: d.next ? page + 1 : page })),
  search: (query, signal) =>
    fetchJson(url('/games', { search: query, search_precise: 'true' }), { signal }).then(mapList),
  byGenres: (genres, signal) =>
    fetchJson(url('/games', { genres: genres.join(','), ordering: '-added' }), { signal }).then(mapList),
  async detail(id, signal) {
    const [g, shots] = await Promise.all([
      fetchJson(url(`/games/${id}`), { signal }),
      fetchJson(url(`/games/${id}/screenshots`), { signal }).catch(() => null),
    ])
    const base = normalize(g)
    const screenshots = [
      ...(shots?.results || []).map((s) => s.image),
      g.background_image_additional,
    ].filter(Boolean)
    return {
      ...base,
      backdropAlts: screenshots.length ? screenshots : base.backdropAlts,
      screenshots,
      genres: (g.genres || []).map((x) => x.name),
      platformNames: (g.platforms || []).map((p) => p.platform?.name).filter(Boolean),
      developers: (g.developers || []).map((d) => d.name),
      publishers: (g.publishers || []).map((d) => d.name),
      stores: (g.stores || []).map((s) => ({ name: s.store?.name, domain: s.store?.domain })).filter((s) => s.name),
      website: g.website || null,
      achievements: g.achievements_count || null,
      ratingsBreakdown: (g.ratings || []).map((r) => ({ title: r.title, percent: r.percent })),
      tags: (g.tags || []).filter((t) => t.language === 'eng' || !t.language).slice(0, 10).map((t) => t.name),
      people: (g.developers || []).map((d) => d.name).slice(0, 4),
      creators: (g.developers || []).map((d) => d.name).slice(0, 3),
      publisher: (g.publishers || [])[0]?.name || '',
      tagline: '',
    }
  },
}

export const GAME_GENRES = [
  { slug: 'action', name: 'Action', icon: 'zap' },
  { slug: 'role-playing-games-rpg', name: 'RPG', icon: 'swords' },
  { slug: 'adventure', name: 'Adventure', icon: 'map' },
  { slug: 'shooter', name: 'Shooter', icon: 'crosshair' },
  { slug: 'indie', name: 'Indie', icon: 'sparkles' },
  { slug: 'strategy', name: 'Strategy', icon: 'brain' },
  { slug: 'puzzle', name: 'Puzzle', icon: 'puzzle' },
  { slug: 'platformer', name: 'Platformer', icon: 'layers' },
  { slug: 'racing', name: 'Racing', icon: 'car' },
  { slug: 'simulation', name: 'Simulation', icon: 'cpu' },
  { slug: 'fighting', name: 'Fighting', icon: 'flame' },
  { slug: 'sports', name: 'Sports', icon: 'trophy' },
]
