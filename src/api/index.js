import { tmdb } from './tmdb'
import { jikan } from './jikan'
import { googleBooks } from './googleBooks'
import { rawg } from './rawg'
import { youtube } from './youtube'

// Maps a category key to its normalized adapter. Every adapter exposes the
// same interface: trending, topRated, newReleases, search, byGenres, detail —
// each returning items in the app's common shape (see any normalize()).
const ADAPTERS = {
  movie: tmdb.movie,
  tv: tmdb.tv,
  documentary: tmdb.documentary,
  anime: jikan,
  book: googleBooks,
  game: rawg,
  youtube: youtube,
}

export function getApi(categoryKey) {
  const api = ADAPTERS[categoryKey]
  if (!api) throw new Error(`No API adapter for category "${categoryKey}"`)
  return api
}

export const ALL_CATEGORY_KEYS = Object.keys(ADAPTERS)
