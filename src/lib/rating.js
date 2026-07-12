// User ratings are stored as 0.5-5 stars in half-star steps. Rows saved
// before the switch used a 1-10 scale — normalize on read so old data still
// renders sensibly (e.g. a legacy 7 becomes 3.5 stars).
export function toStars(rating) {
  if (rating == null) return null
  const n = rating > 5 ? rating / 2 : rating
  return Math.min(5, Math.max(0.5, Math.round(n * 2) / 2))
}

// "4" / "3.5" — no trailing .0 on whole-star ratings.
export function formatStars(stars) {
  return Number.isInteger(stars) ? String(stars) : stars.toFixed(1)
}
