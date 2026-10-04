// Central definition of the categories ("worlds"). Each one carries its own
// identity: palette (mirrored as a CSS theme in index.css, keyed by `key`),
// icon, vocabulary (Watchlist / Want to Read / Backlog…), what progress it
// tracks, and the card shape its items are shown in.

// Library status enum (stored on every library row):
//   wishlist    -> planned ("Watchlist", "Want to Read", "Backlog"…)
//   in_progress -> "Watching" / "Reading" / "Playing"
//   completed   -> "Watched" / "Read" / "Played"
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
    short: 'Movies',
    noun: ['film', 'films'],
    icon: 'film',
    accent: '#e5383b',
    accent2: '#f2c14e',
    tagline: 'Lights down. Curtain up.',
    // Placeholder for your note on something you’ve finished (every world has one).
    notePrompt: 'What did you make of it? The performances, the ending, a scene that stuck with you…',
    source: 'TMDB',
    ratingSource: 'TMDB',
    verbs: { plan: 'Watchlist', progress: 'Watching', done: 'Watched' },
    tabs: { plan: 'Watchlist', done: 'Diary' },
    // Movies are watched in one sitting — no in-progress state.
    noProgress: true,
    tracking: null,
    shape: 'poster',
  },
  {
    key: 'tv',
    route: '/tv',
    label: 'TV Shows',
    short: 'TV',
    noun: ['show', 'shows'],
    icon: 'tv',
    accent: '#3b82f6',
    accent2: '#22d3ee',
    tagline: 'Your next binge starts here.',
    notePrompt: 'How was the whole run? Did the ending land? Best season, best episode…',
    source: 'TMDB',
    ratingSource: 'TMDB',
    verbs: { plan: 'Watchlist', progress: 'Watching', done: 'Watched' },
    tabs: { plan: 'Watchlist', progress: 'Watching', done: 'Finished' },
    tracking: 'episodes',
    shape: 'poster',
  },
  {
    key: 'anime',
    route: '/anime',
    label: 'Anime',
    short: 'Anime',
    noun: ['series', 'series'],
    icon: 'sakura',
    accent: '#ff5c9d',
    accent2: '#8f7cff',
    tagline: 'From shōnen to slice of life.',
    notePrompt: 'Best episode, best moment, favourite character — would you rewatch it?',
    source: 'AniList / MyAnimeList',
    ratingSource: 'AniList',
    verbs: { plan: 'Plan to Watch', progress: 'Watching', done: 'Completed' },
    tabs: { plan: 'Plan to Watch', progress: 'Watching', done: 'Completed' },
    tracking: 'episodes',
    shape: 'poster',
  },
  {
    key: 'book',
    route: '/books',
    label: 'Books',
    short: 'Books',
    noun: ['book', 'books'],
    icon: 'book',
    accent: '#a3432a',
    accent2: '#c68b2c',
    tagline: 'A quiet room full of good pages.',
    notePrompt: 'What was it about for you? A line worth keeping, who you’d lend it to…',
    source: 'Open Library / Google Books',
    ratingSource: 'Readers',
    verbs: { plan: 'Want to Read', progress: 'Reading', done: 'Read' },
    tabs: { plan: 'Want to Read', progress: 'Reading', done: 'Read' },
    tracking: 'pages',
    shape: 'book',
  },
  {
    key: 'game',
    route: '/games',
    label: 'Games',
    short: 'Games',
    noun: ['game', 'games'],
    icon: 'gamepad',
    accent: '#b6f23a',
    accent2: '#25e0c1',
    tagline: 'Press start on something new.',
    notePrompt: 'Best moment, worst level, the boss that broke you — would you replay it?',
    source: 'RAWG',
    ratingSource: 'Metacritic',
    verbs: { plan: 'Backlog', progress: 'Playing', done: 'Played' },
    tabs: { plan: 'Backlog', progress: 'Playing', done: 'Played' },
    tracking: 'hours',
    shape: 'wide',
  },
  {
    key: 'documentary',
    route: '/documentaries',
    label: 'Documentaries',
    short: 'Docs',
    noun: ['documentary', 'documentaries'],
    icon: 'compass',
    accent: '#e2a93b',
    accent2: '#8cc084',
    tagline: 'True stories, told beautifully.',
    notePrompt: 'What did you learn? What stayed with you afterwards?',
    source: 'TMDB',
    ratingSource: 'TMDB',
    verbs: { plan: 'Watchlist', progress: 'Watching', done: 'Watched' },
    tabs: { plan: 'Watchlist', progress: 'Watching', done: 'Watched' },
    tracking: null,
    shape: 'poster',
  },
  {
    key: 'youtube',
    route: '/youtube',
    label: 'YouTube',
    short: 'YouTube',
    noun: ['video', 'videos'],
    icon: 'play',
    accent: '#ff3b3b',
    accent2: '#ff8a3d',
    tagline: 'Long-form worth your time.',
    notePrompt: 'Takeaways, favourite moments, things to look up next…',
    source: 'YouTube',
    ratingSource: 'YouTube',
    verbs: { plan: 'Watch Later', progress: 'Watching', done: 'Watched' },
    tabs: { plan: 'Watch Later', progress: 'Watching', done: 'Watched' },
    tracking: null,
    shape: 'video',
  },
]

export const CATEGORY_BY_KEY = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]))

// Background colour per theme, for <meta name="theme-color">.
export const THEME_BG = {
  home: '#09090e',
  movie: '#0a0808',
  tv: '#060a13',
  anime: '#0d0a1a',
  book: '#f3ece0',
  game: '#06080b',
  documentary: '#0c0e0b',
  youtube: '#0f0f0f',
}

export const plural = (category, n) => `${n} ${category.noun[n === 1 ? 0 : 1]}`

// The submenu inside a category page: Discover + one tab per library status.
// Categories with `noProgress` (movies) skip the in-progress tab.
export function getSubmenu(category) {
  const { tabs, noProgress } = category
  return [
    { key: 'discover', label: 'Discover', status: null },
    { key: 'plan', label: tabs.plan, status: STATUS.WISHLIST },
    ...(noProgress ? [] : [{ key: 'progress', label: tabs.progress, status: STATUS.IN_PROGRESS }]),
    { key: 'done', label: tabs.done, status: STATUS.COMPLETED },
  ]
}

// Status choices offered for an item (segmented control / menus).
export function getStatusOptions(category) {
  const { verbs, noProgress } = category
  return [
    { status: STATUS.WISHLIST, label: verbs.plan, action: `Add to ${verbs.plan}` },
    ...(noProgress
      ? []
      : [{ status: STATUS.IN_PROGRESS, label: verbs.progress, action: `Mark as ${verbs.progress}` }]),
    { status: STATUS.COMPLETED, label: verbs.done, action: `Mark as ${verbs.done}` },
  ]
}

export function statusLabel(category, status) {
  if (status === STATUS.DROPPED) return 'Dropped'
  return getStatusOptions(category).find((o) => o.status === status)?.label ?? 'Saved'
}
