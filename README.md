# 🗄️ Vault — All-in-One Entertainment Tracker

Track everything you watch, read and play across seven worlds — **Movies, TV
Shows, Anime, Books, Games, Documentaries and YouTube** — in one app. Think
Letterboxd + Serializd + AniList + Goodreads + Backloggd + a Watch Later queue,
under one roof.

Each world is designed for its medium rather than sharing one template: its
own layout, typography, colour, texture and way of tracking progress.

## The seven worlds

| World             | Feels like           | Highlights                                                                                                                                               |
| ----------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Movies**        | a cinema             | Ken-Burns hero with trailer, Top 10 with outline numerals, Coming Soon dates, a monthly **Diary** with stars and hearts, full credits on the detail page |
| **TV Shows**      | an episode tracker   | Continue Watching with "✓ next episode", Airing Today, season browser with per-episode ticks, auto-complete when the last episode is marked            |
| **Anime**         | a seasonal chart     | This season's chart with a season switcher, a 7-day airing schedule, live "Ep 5 in 2d" ribbons, characters & voice actors, a −/+ episode counter        |
| **Books**         | a reading room       | Light paper theme, 3D covers on wooden shelves, Book of the Day, a yearly reading challenge, page-by-page progress and reading-time estimates            |
| **Games**         | a game HUD           | Chamfered capsules with screenshot scrubbing, platform filters, Metacritic badges, hours played and "beat it", screenshot lightbox                      |
| **Documentaries** | a magazine           | "Field Notes" issue masthead, cover story, numbered topic contents, editor's picks, long-form detail pages with a drop cap and a facts sidebar           |
| **YouTube**       | a video platform     | Topic and creator chips, featured upload, 16:9 grids with durations and views, a playlist-style **Watch Later** with Play all / Shuffle, embedded player |

Across all of them:

- **Home hub** — greeting, streak and totals, a Continue row that picks up
  wherever you left off (with a one-tap "+1 episode / +10 pages / +1 hour"),
  and a portal into each world.
- **Command palette** — <kbd>⌘K</kbd> / <kbd>Ctrl K</kbd> or <kbd>/</kbd>
  searches every world at once, plus your own library.
- **Quick actions** on every card, **undo** on every change, ratings in half
  stars, favourites, private notes and reviews.
- **My Stats** — finished this year, hours by world, a 12-month activity
  chart, your library by stage and a rating histogram (each chart has a table
  view).
- **Settings** — device sync, JSON backup / restore, reading goal, data-source
  status.
- Responsive throughout: top bar + category tabs on desktop, bottom tab bar on
  phones. Respects `prefers-reduced-motion`.

## Stack

- **React 19 + Vite**, **React Router 7** (each world's pages are lazy
  loaded), **TanStack Query 5** for fetching and caching.
- **Tailwind CSS v4** with semantic design tokens (`bg`, `surface`, `fg`,
  `accent`, `font-display`, `rounded-card`, …) that every world redefines.
- Self-hosted fonts via **Fontsource**: Inter, Bebas Neue (movies), Space
  Grotesk (TV), M PLUS Rounded 1c (anime), Fraunces + Literata (books),
  Chakra Petch (games), Newsreader (documentaries).
- **Netlify Functions + Blobs (optional)** — a tiny relay for device sync.
  The library always lives in `localStorage`; without the function the app
  still runs fully, just single-device.

## Data sources

| World              | Source                                                           | Key                                    |
| ------------------ | ---------------------------------------------------------------- | -------------------------------------- |
| Movies / TV / Docs | TMDB (documentaries = the Documentary genre)                     | `VITE_TMDB_API_KEY`                    |
| Anime              | AniList (GraphQL), falling back to Jikan (MyAnimeList)           | none                                   |
| Books              | Open Library for discovery; Google Books for search and details | none (`VITE_GOOGLE_BOOKS_API_KEY` optional) |
| Games              | RAWG                                                             | `VITE_RAWG_API_KEY`                    |
| YouTube            | YouTube Data API v3 (quota-aware: curated channels, batched)     | `VITE_YOUTUBE_API_KEY`                 |

Keys are read at **build time** (`VITE_*`), so set them before `npm run dev`
or `npm run build`. A world whose key is missing shows a friendly "add your
key" state; Anime and Books work with no keys at all.

## Getting started

```bash
npm install
cp .env.example .env     # add your keys (all optional — see above)
npm run dev
```

Open the printed local URL. Your library is saved to the browser — no account
needed.

## Deploying

The included `netlify.toml` builds Vite, serves the SPA with a catch-all
redirect, and picks up the sync function automatically.

- **Netlify UI:** import the repo, then add `VITE_TMDB_API_KEY`,
  `VITE_RAWG_API_KEY` and `VITE_YOUTUBE_API_KEY` (and optionally
  `VITE_GOOGLE_BOOKS_API_KEY`) under *Site configuration → Environment
  variables* and trigger a deploy.
- **CLI:** `npm run deploy` (runs `netlify deploy --prod --build`; log in with
  `npx netlify login` or set `NETLIFY_AUTH_TOKEN` first).

Any static host works for the app itself (`npm run build` → `dist/`, with
unknown paths rewritten to `index.html`); only device sync needs Netlify.

### Enabling device sync (optional)

Keeps your library identical across phone/PC/tablet without accounts: one
device creates a **sync code**, the others enter it, and every change on any
linked device propagates to all of them (two-way).

It rides on [Netlify Blobs](https://docs.netlify.com/blobs/overview/) via the
one function in [`netlify/functions/sync.mjs`](netlify/functions/sync.mjs) —
no database, no env vars, no accounts. The sync code IS the auth: each code
maps to one `{ rev, data }` document, writes are optimistic-concurrency
checked (409 → merge → retry), and clients poll + re-sync on focus.

1. Deploy the site to Netlify (see above).
2. Open the deployed app on your first device: **Settings** → *Device sync* →
   **Create sync code**.
3. On your other devices, enter that code under **Link device**.

For local development with sync, run `npx netlify dev` instead of
`npm run dev` — it serves Vite and emulates the function + blob store. Plain
`npm run dev` still works; sync just reports the backend as unavailable.

Edits merge per item (newest change wins, deletions tracked as tombstones),
so devices can go offline and reconcile the next time they open the app.

## Architecture

```
src/
  api/           one adapter per source (tmdb, anilist + jikan → anime,
                 openLibrary + googleBooks, rawg, youtube), all returning one
                 normalized item shape; index.js maps world → adapter
  config/        categories.js — each world's route, tabs, verbs, icon,
                 accent, card shape and how progress is tracked
  worlds/
    movie/ tv/ anime/ book/ game/ documentary/ youtube/
                 Discover.jsx, Library.jsx, Detail.jsx (+ world-only parts)
    shared/      shelves, library sorting/toolbar, detail building blocks,
                 Pick-for-me, genre browser, in-world search
  pages/         HomePage, CategoryPage (routes to a world's Discover or
                 Library), DetailPage, SearchPage, StatsPage, AccountPage
  components/
    shell/       TopBar, CategoryBar, MobileBar, CommandPalette, Layout
    cards/       PosterCard, WideCard, BookCard, GameCard, VideoCard,
                 ContinueCard, MediaCard (picks one by world)
    library/     QuickActions, StatusControl, ProgressControl
    charts/      accessible bar/column/stacked charts with table views
    ui/          Button, Icon, Img, Rail, Modal, Stars, Progress, Skeleton…
  hooks/         useLibrary, useItemActions (status/progress/rating/undo),
                 useDiscover, useTheme, usePref…
  lib/           localStorage library + sync engine, progress rules per
                 world, stats, formatting, backup
netlify/
  functions/     sync.mjs — the Blobs-backed sync relay (one doc per code)
```

### Theming

Every page sets `data-theme="<world>"` on `<html>`; `src/index.css` maps each
theme to surfaces, ink, accent, display font, corner radii and a background
texture (film grain, scanlines, halftone, paper, HUD grid, contour lines).
Mixed pages (Home, Search, Stats) use `data-accent="<world>"` to give a single
card or section its world's voice without changing the page around it.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run preview` — preview the production build
- `npm run lint` — run ESLint
- `npm run deploy` — build and deploy to Netlify (needs Netlify auth)
