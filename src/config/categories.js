// Central definition of the categories. The per-category page template,
// navbar, submenu and theming all read from here. Each category carries its
// own visual identity: a two-tone accent gradient (`accent` -> `accent2`), a
// tagline, and a `key` that index.css uses (via <html data-category>) to apply
// signature backgrounds and typography per category.

// Library status enum (matches the Supabase `library_items.status` column):
//   wishlist    -> "Watchlist" / "Wishlist" (planned)
//   in_progress -> "Watching" / "Playing" / "Reading"
//   completed   -> "Watched" / "Played" / "Read"
//   dropped     -> "Dropped"
export const STATUS = {
  WISHLIST: 'wishlist',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  DROPPED: 'dropped',
}

export const CATEGORIES = [
  {
    key: 'movie',
    route: '/movies',
    label: 'Movies',
    icon: '🎬',
    accent: '#e50914',
    accent2: '#f5c518',
    accentSoft: 'rgba(229, 9, 20, 0.15)',
    tagline: 'Lights down. Curtain up.',
    source: 'TMDB',
    verbs: { plan: 'Watchlist', progress: 'Watching', done: 'Watched' },
    // Movies are watched in one sitting — no in-progress state.
    noProgress: true,
  },
  {
    key: 'tv',
    route: '/tv',
    label: 'TV Shows',
    icon: '📺',
    accent: '#3b82f6',
    accent2: '#22d3ee',
    accentSoft: 'rgba(59, 130, 246, 0.15)',
    tagline: 'Your next binge starts here.',
    source: 'TMDB',
    verbs: { plan: 'Watchlist', progress: 'Watching', done: 'Watched' },
  },
  {
    key: 'anime',
    route: '/anime',
    label: 'Anime',
    icon: '🌸',
    accent: '#a855f7',
    accent2: '#ec4899',
    accentSoft: 'rgba(168, 85, 247, 0.15)',
    tagline: 'From shonen to slice of life.',
    source: 'Jikan / AniList',
    verbs: { plan: 'Watchlist', progress: 'Watching', done: 'Watched' },
  },
  {
    key: 'book',
    route: '/books',
    label: 'Books',
    icon: '📚',
    accent: '#f59e0b',
    accent2: '#fde68a',
    accentSoft: 'rgba(245, 158, 11, 0.15)',
    tagline: 'A quiet shelf of good pages.',
    source: 'Google Books',
    verbs: { plan: 'Wishlist', progress: 'Reading', done: 'Read' },
  },
  {
    key: 'game',
    route: '/games',
    label: 'Games',
    icon: '🎮',
    accent: '#14b8a6',
    accent2: '#a3e635',
    accentSoft: 'rgba(20, 184, 166, 0.15)',
    tagline: 'Press start on something new.',
    source: 'RAWG',
    verbs: { plan: 'Wishlist', progress: 'Playing', done: 'Played' },
  },
  {
    key: 'documentary',
    route: '/documentaries',
    label: 'Documentaries',
    icon: '🎞️',
    accent: '#10b981',
    accent2: '#0ea5e9',
    accentSoft: 'rgba(16, 185, 129, 0.15)',
    tagline: 'True stories, told beautifully.',
    source: 'TMDB',
    verbs: { plan: 'Watchlist', progress: 'Watching', done: 'Watched' },
  },
  {
    key: 'youtube',
    route: '/youtube',
    label: 'YouTube',
    icon: '▶️',
    accent: '#f97316',
    accent2: '#dc2626',
    accentSoft: 'rgba(249, 115, 22, 0.15)',
    tagline: 'Long-form worth your watch.',
    source: 'YouTube',
    verbs: { plan: 'Watchlist', progress: 'Watching', done: 'Watched' },
  },
]

// Push a category's palette + identity onto the document so CSS can theme the
// whole app (ambient background, title typography, accent gradients).
export function applyCategoryTheme(category) {
  const root = document.documentElement
  root.style.setProperty('--accent', category.accent)
  root.style.setProperty('--accent-2', category.accent2)
  root.style.setProperty('--accent-soft', category.accentSoft)
  root.dataset.category = category.key
}

export const CATEGORY_BY_KEY = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c]),
)

export const CATEGORY_BY_ROUTE = Object.fromEntries(
  CATEGORIES.map((c) => [c.route, c]),
)

// The secondary submenu shown inside every category page. Categories with
// `noProgress` (e.g. movies) skip the in-progress tab.
export function getSubmenu(category) {
  const { verbs, noProgress } = category
  return [
    { key: 'discover', label: 'Discover', status: null },
    { key: 'plan', label: verbs.plan, status: STATUS.WISHLIST },
    ...(noProgress
      ? []
      : [{ key: 'progress', label: verbs.progress, status: STATUS.IN_PROGRESS }]),
    { key: 'done', label: verbs.done, status: STATUS.COMPLETED },
  ]
}

// Labels for the quick-add / status dropdown attached to every card.
// Categories with `noProgress` skip the in-progress option.
export function getStatusOptions(category) {
  const { verbs, noProgress } = category
  return [
    { status: STATUS.WISHLIST, label: `Add to ${verbs.plan}` },
    ...(noProgress
      ? []
      : [{ status: STATUS.IN_PROGRESS, label: `Mark as ${verbs.progress}` }]),
    { status: STATUS.COMPLETED, label: `Mark as ${verbs.done}` },
  ]
}
