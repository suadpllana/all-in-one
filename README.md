# 🗄️ Vault — All-in-One Entertainment Tracker

Track everything you watch, read, and play across six categories — **Movies, TV
Shows, Anime, Books, Games, and Documentaries** — in one unified app. Think
Letterboxd + MyAnimeList + Goodreads + a backlog tracker, one consistent design
language.

## Stack

- **React 19 + Vite**
- **React Router** — one route per category (`/movies`, `/tv`, `/anime`,
  `/books`, `/games`, `/documentaries`), each with a Discover / Watchlist /
  In-progress / Completed submenu.
- **TanStack Query** — API fetching, caching, loading & error states.
- **Tailwind CSS v4** — dark-mode-first; each category has a distinct accent
  color while layout/typography stay identical.
- **Netlify Blobs (optional)** — a single tiny serverless function used as a
  device-sync relay. The library always lives in `localStorage`; a sync code
  keeps multiple devices merged. Without it the app still runs fully, just
  single-device.

## Data sources

| Category           | API                                   | Key required            |
| ------------------ | ------------------------------------- | ----------------------- |
| Movies / TV / Docs | TMDB (docs = Documentary genre)       | `VITE_TMDB_API_KEY`     |
| Anime              | Jikan (MyAnimeList) → AniList fallback | none                    |
| Books              | Google Books                          | optional (higher quota) |
| Games              | RAWG                                  | `VITE_RAWG_API_KEY`     |

## Getting started

```bash
npm install
cp .env.example .env     # add your keys (all optional — see below)
npm run dev
```

Open the printed local URL. **It works out of the box:** any category whose key
is missing shows a friendly "add your key" state; the anime tab needs no key at
all. Your library is saved to the browser (`localStorage`) — no account needed.

### Enabling device sync (optional)

Keeps your library identical across phone/PC/tablet without accounts: one
device creates a **sync code**, the others enter it, and every change on any
linked device propagates to all of them (two-way).

It rides on [Netlify Blobs](https://docs.netlify.com/blobs/overview/) via the
one function in [`netlify/functions/sync.mjs`](netlify/functions/sync.mjs) —
no database, no env vars, no accounts. The sync code IS the auth: each code
maps to one `{ rev, data }` document, writes are optimistic-concurrency
checked (409 → merge → retry), and clients poll + re-sync on focus.

1. Deploy the site to [Netlify](https://netlify.com) (the included
   `netlify.toml` builds Vite and picks up the function automatically).
2. Open the deployed app on your first device: avatar menu → **Settings** →
   *Device sync* → **Create sync code**.
3. On your other devices, enter that code under **Link device**.

For local development with sync, run `npx netlify dev` instead of
`npm run dev` — it serves Vite and emulates the function + blob store. Plain
`npm run dev` still works; sync just reports the backend as unavailable.

Deletions and edits merge per item (newest change wins, deletions tracked as
tombstones), so devices can go offline and reconcile the next time they open
the app.

## Architecture

```
src/
  api/           adapters (tmdb, jikan, anilist, googleBooks, rawg) → one
                 normalized item shape; index.js maps category → adapter
  components/    shell (Navbar, MobileNav, Submenu, AvatarMenu, GlobalSearch)
                 + shared UI (MediaCard, Carousel, Hero, Section, DetailModal,
                 StatusDropdown, Skeleton)
  config/        categories.js — the single source of truth for tabs, accent
                 colors, and per-category verbs (Watch/Read/Play)
  context/       AuthContext (local guest identity)
  hooks/         useLibrary (react-query CRUD), useDiscover (shelves + recs)
  lib/           localStorage library store + device-sync engine (sync.js)
netlify/
  functions/     sync.mjs — the Blobs-backed sync relay (one doc per code)
  pages/         CategoryPage (the reusable template), LibraryView, SearchPage,
                 StatsPage, AccountPage, AuthPage
```

The six category pages all render the **same `CategoryPage` template** — only
the config entry (accent color, copy, data adapter) differs. Add a seventh
category by adding one object to `config/categories.js` and one adapter.

## Features

- Hero carousel of newest releases · Recommended-for-you (content-based from
  your library) · Trending · Top Rated shelves.
- Quick-add status dropdown on every card + a rich detail modal (synopsis,
  cast/author/developer, runtime/pages/playtime, personal 1–10 rating).
- Global debounced search that fans out across all six categories at once.
- Cross-category **My Stats** dashboard (items tracked, hours logged, per-
  category breakdown).
- Fully responsive — top navbar on desktop, bottom tab bar on mobile.
- Skeleton loaders everywhere; graceful rate-limit / API-down / missing-key
  states.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run preview` — preview the production build
- `npm run lint` — run ESLint
