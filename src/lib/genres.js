// Human-readable genre chips for cards. TMDB list endpoints only return
// numeric genre ids, so those are mapped here; other sources already ship
// strings (RAWG slugs, Jikan/Google Books names, YouTube channel names).

// Combined TMDB movie + TV genre map (ids don't collide across the two).
const TMDB_GENRES = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
}

// Title-case lowercase slugs ("role-playing-games" -> "Role Playing Games");
// leave already-formatted names ("Slice of Life", "LEMMiNO") untouched.
const prettify = (s) =>
  /^[a-z0-9-]+$/.test(s)
    ? s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : s

export function genreLabels(item, max = 3) {
  const seen = new Set()
  const out = []
  for (const g of item.genreIds || []) {
    const label = typeof g === 'number' ? TMDB_GENRES[g] : prettify(String(g))
    if (label && !seen.has(label)) {
      seen.add(label)
      out.push(label)
      if (out.length >= max) break
    }
  }
  return out
}
