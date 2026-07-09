import { useEffect, useState } from 'react'
import StatusDropdown from './StatusDropdown'
import { HeroSkeleton } from './Skeleton'
import { ErrorState } from './states'

// Some sources (RAWG) return thumbnail-sized "backdrops" that turn into a
// blurry mess stretched across the banner. Probe an image's real width so
// sub-HD art can be skipped or swapped for an alternative.
const MIN_BACKDROP_WIDTH = 960

function probeWidth(url) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img.naturalWidth)
    img.onerror = () => resolve(0)
    img.src = url
  })
}

// First HD-width image among the item's backdrop and its alternates.
async function bestBackdrop(item) {
  for (const url of [item.backdropUrl, ...(item.backdropAlts || [])]) {
    if (url && (await probeWidth(url)) >= MIN_BACKDROP_WIDTH) return url
  }
  return null
}

// Auto-rotating banner of the newest releases for a category.
export default function Hero({ query, onOpen }) {
  const { data, isLoading, error, refetch } = query
  // The hero is a full-width banner, so only feature items that have a proper
  // wide, HD backdrop. Tall posters get cropped into an ugly zoomed strip and
  // low-res art upscales blurry. Fall back to the raw list if nothing
  // qualifies, so it's never empty.
  const [slides, setSlides] = useState(null)
  const [i, setI] = useState(0)

  useEffect(() => {
    if (!data) return
    let cancelled = false
    const withBackdrop = data.filter((s) => s.backdropUrl)
    ;(async () => {
      const candidates = withBackdrop.slice(0, 8)
      const probed = await Promise.all(
        candidates.map(async (s) => {
          const url = await bestBackdrop(s)
          return url ? { ...s, backdropUrl: url } : null
        }),
      )
      if (cancelled) return
      const hd = probed.filter(Boolean)
      setSlides(
        (hd.length ? hd : withBackdrop.length ? withBackdrop : data).slice(0, 5),
      )
      setI(0)
    })()
    return () => {
      cancelled = true
    }
  }, [data])
  // Bumped on manual navigation so the auto-rotate timer restarts instead of
  // advancing right after the user clicked.
  const [epoch, setEpoch] = useState(0)
  // Pause auto-rotation while the user is over the banner or reading an
  // expanded description. Expansion is keyed to the slide index so it
  // collapses on its own when the slide changes.
  const [hovered, setHovered] = useState(false)
  const [expandedIdx, setExpandedIdx] = useState(null)
  const expanded = expandedIdx === i

  const count = slides?.length || 0

  useEffect(() => {
    if (count < 2 || hovered || expanded) return
    const t = setInterval(() => setI((n) => (n + 1) % count), 6000)
    return () => clearInterval(t)
  }, [count, epoch, hovered, expanded])

  const go = (dir) => {
    setI((n) => (n + dir + count) % count)
    setEpoch((e) => e + 1)
  }

  if (error) return <ErrorState error={error} onRetry={refetch} />
  // Keep the skeleton up while backdrop candidates are still being probed.
  if (isLoading || slides === null) return <HeroSkeleton />
  if (slides.length === 0) return null

  const active = slides[i]

  return (
    // 21:9 tracks the 16:9 source art closely enough that object-cover only
    // trims the edges instead of slicing the image in half (the old fixed
    // 46vh made a ~3.2:1 strip on wide screens). Height clamps keep it sane
    // on very narrow/wide viewports.
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative aspect-[21/9] max-h-[64vh] min-h-[300px] w-full overflow-hidden rounded-2xl ring-1 ring-white/10"
    >
      {slides.map((s, idx) => (
        <div
          key={s.externalId}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: idx === i ? 1 : 0 }}
        >
          {s.backdropUrl ? (
            // Wide backdrop: fill the whole banner.
            <img
              src={s.backdropUrl}
              alt=""
              // Bias the crop upward — faces sit in the top half of most stills.
              className="h-full w-full object-cover object-[center_30%]"
            />
          ) : (
            // No wide art: blurred fill behind the poster so it still spans the
            // full width instead of a zoomed strip, poster shown intact on top.
            <>
              <img
                src={s.posterUrl}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl"
              />
              <img
                src={s.posterUrl}
                alt=""
                className="relative ml-auto mr-[8%] h-full object-contain"
              />
            </>
          )}
          {/* Bottom scrim keeps the title/description legible; it fades out
              well before the top so the backdrop stays visible. */}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/40 to-transparent" />
          {/* Left scrim is only strong behind the text and clears by mid-frame
              so the right half of the image reads fully. */}
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-bg)] via-[var(--color-bg)]/10 to-transparent" />
        </div>
      ))}

      <div className="relative flex h-full max-w-2xl flex-col justify-end gap-3 p-6 md:p-10">
        <span className="bg-gradient-accent w-fit rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-white shadow-lg">
          New release
        </span>
        <h1 className="text-3xl font-black leading-tight drop-shadow md:text-5xl">
          {active.title}
        </h1>
        <div className="flex items-center gap-3 text-sm text-[var(--color-muted)]">
          {active.year && <span>{active.year}</span>}
          {active.rating != null && <span className="text-accent">★ {active.rating.toFixed(1)}</span>}
        </div>
        <p
          className={`max-w-xl text-sm text-white/80 md:text-base ${
            expanded ? 'max-h-28 overflow-y-auto pr-2 md:max-h-40' : 'line-clamp-2'
          }`}
        >
          {active.overview}
        </p>
        {/* ~150 chars is where two clamped lines start truncating. */}
        {(active.overview?.length || 0) > 150 && (
          <button
            onClick={() => setExpandedIdx(expanded ? null : i)}
            className="w-fit text-sm font-semibold text-accent hover:underline"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => onOpen(active)}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
          >
            ▸ Details
          </button>
          <div className="w-40">
            <StatusDropdown item={active} variant="detail" />
          </div>
        </div>

        {slides.length > 1 && (
          <div className="absolute bottom-4 right-6 flex gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: idx === i ? 20 : 8,
                  background:
                    idx === i
                      ? 'linear-gradient(90deg, var(--accent), var(--accent-2))'
                      : 'rgba(255,255,255,.4)',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Prev/next arrows — direct children of the banner so they pin to its
          real edges (the text column above is only max-w-2xl wide). */}
      {slides.length > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/65"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/65"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </>
      )}
    </div>
  )
}
