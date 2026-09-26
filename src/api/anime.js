import { anilist, currentSeason, shiftSeason } from './anilist'
import { jikan } from './jikan'

// Anime adapter: AniList first, MyAnimeList (Jikan) when AniList fails.
async function withFallback(primary, fallback) {
  try {
    return await primary()
  } catch (err) {
    if (err.name === 'AbortError' || !fallback) throw err
    return fallback()
  }
}

export { currentSeason, shiftSeason }

export const anime = {
  trending: (signal) => withFallback(() => anilist.trending(signal), () => jikan.trending(signal)),
  topRated: (signal) => withFallback(() => anilist.topRated(signal), () => jikan.topRated(signal)),
  popular: (signal) => withFallback(() => anilist.popular(signal), () => jikan.popular(signal)),
  newReleases: (signal) => withFallback(() => anilist.newReleases(signal), () => jikan.newReleases(signal)),
  season: (s, signal) => withFallback(() => anilist.season(s, signal), () => jikan.season(s, signal)),
  schedule: (range, signal) => anilist.schedule(range, signal),
  airing: (ids, signal) => anilist.airing(ids, signal).catch(() => ({})),
  search: (query, signal) => withFallback(() => anilist.search(query, signal), () => jikan.search(query, signal)),
  byGenres: (genres, signal) => anilist.byGenres(genres, signal).catch(() => []),
  detail: (externalId, signal) =>
    withFallback(
      () => anilist.detail(externalId, signal),
      // Jikan only knows MAL ids.
      String(externalId).startsWith('al:') ? null : () => jikan.detail(externalId, signal),
    ),
}

export const ANIME_GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Mystery',
  'Psychological',
  'Supernatural',
  'Sports',
  'Mecha',
  'Music',
  'Horror',
  'Thriller',
]

export const FORMAT_LABEL = {
  TV: 'TV',
  TV_SHORT: 'TV Short',
  MOVIE: 'Movie',
  SPECIAL: 'Special',
  OVA: 'OVA',
  ONA: 'ONA',
  MUSIC: 'Music',
}

export const SOURCE_LABEL = {
  ORIGINAL: 'Original',
  MANGA: 'Manga',
  LIGHT_NOVEL: 'Light novel',
  VISUAL_NOVEL: 'Visual novel',
  VIDEO_GAME: 'Video game',
  NOVEL: 'Novel',
  WEB_NOVEL: 'Web novel',
  '4_KOMA_MANGA': '4-koma manga',
  OTHER: 'Other',
}
