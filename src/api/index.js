import { tmdb } from './tmdb'
import { anime } from './anime'
import { googleBooks } from './googleBooks'
import { rawg } from './rawg'
import { youtube } from './youtube'

// Maps a category key to its normalized adapter. Every adapter exposes the
// same core interface — trending, topRated, newReleases, search, byGenres,
// detail — returning items in the app's common shape, plus world-specific
// extras (tmdb.movie.upcoming, tmdb.tv.season, anime.schedule,
// googleBooks.subject, rawg.upcoming, youtube.creators…).
// Listed in navigation order — search results and the command palette
// follow it.
const ADAPTERS = {
  movie: tmdb.movie,
  tv: tmdb.tv,
  anime,
  book: googleBooks,
  game: rawg,
  documentary: tmdb.documentary,
  youtube,
}

export function getApi(categoryKey) {
  const api = ADAPTERS[categoryKey]
  if (!api) throw new Error(`No API adapter for category "${categoryKey}"`)
  return api
}

export const ALL_CATEGORY_KEYS = Object.keys(ADAPTERS)
