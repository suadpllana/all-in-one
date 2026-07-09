import { CATEGORY_BY_KEY } from '../config/categories'

// Canonical URL for an item's detail page, e.g. /anime/54321 or /books/zyTC…
// External ids can contain reserved characters (AniList uses "al:123"), so
// encode them into the path segment.
export function detailPath(item) {
  const route = CATEGORY_BY_KEY[item.category].route
  return `${route}/${encodeURIComponent(item.externalId)}`
}

// The submenu tab keys that share the /{category}/:segment slot with item ids.
export const VIEW_SEGMENTS = ['plan', 'progress', 'done']
