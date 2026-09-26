import { useState } from 'react'
import { cn } from '../../lib/cn'

const STAR = 'm12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z'

// A star that can be empty, half or full: a muted base glyph with a filled
// copy clipped to the fill fraction.
function StarGlyph({ fill, size }) {
  return (
    <span className="relative inline-block" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full text-muted/35" fill="currentColor">
        <path d={STAR} />
      </svg>
      {fill > 0 && (
        <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
          <svg
            viewBox="0 0 24 24"
            className="h-full text-gold drop-shadow-[0_0_6px_rgba(245,184,61,.35)]"
            style={{ width: size }}
            fill="currentColor"
          >
            <path d={STAR} />
          </svg>
        </span>
      )}
    </span>
  )
}

const fillFor = (value, n) => (value >= n ? 1 : value >= n - 0.5 ? 0.5 : 0)

// Read-only 0–5 stars (half steps).
export function Stars({ value = 0, size = 14, className }) {
  return (
    <span className={cn('inline-flex items-center gap-px', className)} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarGlyph key={n} fill={fillFor(value, n)} size={size} />
      ))}
    </span>
  )
}

// Interactive 0.5–5 picker. Each star has two hit zones (left half = n-0.5,
// right half = n). Clicking the current value clears it.
export function StarRatingInput({ value, onRate, size = 24, className }) {
  const [hover, setHover] = useState(null)
  const shown = hover ?? value ?? 0
  return (
    <span
      role="radiogroup"
      aria-label="Your rating"
      className={cn('inline-flex items-center gap-0.5', className)}
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className="relative transition-transform duration-150 hover:scale-110">
          <StarGlyph fill={fillFor(shown, n)} size={size} />
          {[n - 0.5, n].map((v) => (
            <button
              key={v}
              type="button"
              onMouseEnter={() => setHover(v)}
              onFocus={() => setHover(v)}
              onBlur={() => setHover(null)}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onRate(v === value ? null : v)
              }}
              role="radio"
              aria-checked={v === value}
              aria-label={`${v} star${v === 1 ? '' : 's'}`}
              title={v === value ? 'Clear rating' : `Rate ${v}/5`}
              className={cn(
                'absolute inset-y-0 w-1/2 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                v === n - 0.5 ? 'left-0' : 'right-0',
              )}
            />
          ))}
        </span>
      ))}
    </span>
  )
}
