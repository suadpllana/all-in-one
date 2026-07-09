import { useEffect, useState } from 'react'
import StatusDropdown from './StatusDropdown'
import { HeroSkeleton } from './Skeleton'
import { ErrorState } from './states'

// Auto-rotating banner of the newest releases for a category.
export default function Hero({ query, onOpen }) {
  const { data, isLoading, error, refetch } = query
  // The hero is a full-width banner, so only feature items that have a proper
  // wide backdrop. Tall posters get cropped into an ugly zoomed strip. Fall
  // back to the raw list if nothing has a backdrop, so it's never empty.
  const items = data || []
  const withBackdrop = items.filter((s) => s.backdropUrl)
  const slides = (withBackdrop.length ? withBackdrop : items).slice(0, 5)
  const [i, setI] = useState(0)
  // Bumped on manual navigation so the auto-rotate timer restarts instead of
  // advancing right after the user clicked.
  const [epoch, setEpoch] = useState(0)

  useEffect(() => {
    if (slides.length < 2) return
    const t = setInterval(() => setI((n) => (n + 1) % slides.length), 6000)
    return () => clearInterval(t)
  }, [slides.length, epoch])

  const go = (dir) => {
    setI((n) => (n + dir + slides.length) % slides.length)
    setEpoch((e) => e + 1)
  }

  if (isLoading) return <HeroSkeleton />
  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (slides.length === 0) return null

  const active = slides[i]

  return (
    // 21:9 tracks the 16:9 source art closely enough that object-cover only
    // trims the edges instead of slicing the image in half (the old fixed
    // 46vh made a ~3.2:1 strip on wide screens). Height clamps keep it sane
    // on very narrow/wide viewports.
    <div className="relative aspect-[21/9] max-h-[64vh] min-h-[300px] w-full overflow-hidden rounded-2xl ring-1 ring-white/10">
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
        <p className="line-clamp-2 max-w-xl text-sm text-white/80 md:text-base">
          {active.overview}
        </p>
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
