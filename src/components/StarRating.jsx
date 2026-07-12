import { useState } from 'react'
import { cn } from '../lib/cn'

// Interactive 0.5-5 star picker. Each star has two click zones: the left
// half rates n-0.5, the right half rates n. Clicking the current rating
// clears it.
export function StarRatingInput({ value, onRate, className }) {
  const [hover, setHover] = useState(null)
  const shown = hover ?? value ?? 0
  return (
    <span
      role="radiogroup"
      aria-label="Your rating"
      className={cn('inline-flex leading-none', className)}
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className="relative px-px">
          <StarGlyph fill={shown >= n ? 1 : shown >= n - 0.5 ? 0.5 : 0} />
          {[n - 0.5, n].map((v) => (
            <button
              key={v}
              type="button"
              onMouseEnter={() => setHover(v)}
              onClick={(e) => {
                e.stopPropagation()
                onRate(v === value ? null : v)
              }}
              role="radio"
              aria-checked={v === value}
              aria-label={`${v} star${v === 1 ? '' : 's'}`}
              title={v === value ? 'Clear rating' : `Rate ${v}/5`}
              className={cn(
                'absolute inset-y-0 w-1/2 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent',
                v === n - 0.5 ? 'left-0' : 'right-0',
              )}
            />
          ))}
        </span>
      ))}
    </span>
  )
}

// A ★ that can be empty, half or fully filled (gold layer clipped over a
// muted base glyph).
function StarGlyph({ fill }) {
  return (
    <span className="relative inline-block">
      <span className="text-[var(--color-muted)] opacity-50">★</span>
      {fill > 0 && (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 overflow-hidden text-amber-400"
          style={{ width: `${fill * 100}%` }}
        >
          ★
        </span>
      )}
    </span>
  )
}
