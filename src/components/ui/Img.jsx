import { useState } from 'react'
import { cn } from '../../lib/cn'

// <img> that fades in once decoded and falls back to a titled placeholder
// when there's no source or it fails to load. The wrapper owns the box
// (size/aspect/radius); the image always covers it.
export default function Img({
  src: primary,
  fallbackSrc,
  alt = '',
  className,
  imgClassName,
  fallback,
  title,
  eager = false,
  ...rest
}) {
  const [state, setState] = useState({ key: primary, loaded: false, failed: false, useFallback: false })
  // Reset when the source changes (render-time pattern, no effect).
  if (state.key !== primary) setState({ key: primary, loaded: false, failed: false, useFallback: false })
  const src = state.useFallback ? fallbackSrc : primary

  const showImg = src && !state.failed
  return (
    <div className={cn('relative overflow-hidden bg-surface-2', className)}>
      {showImg && (
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          ref={(el) => {
            // Cached images can be complete before React's onLoad fires.
            if (el?.complete && el.naturalWidth && !state.loaded) {
              setState((s) => (s.key === primary ? { ...s, loaded: true } : s))
            }
          }}
          onLoad={() => setState((s) => ({ ...s, loaded: true }))}
          onError={() =>
            setState((s) =>
              fallbackSrc && !s.useFallback && fallbackSrc !== primary
                ? { ...s, useFallback: true }
                : { ...s, failed: true },
            )
          }
          className={cn(
            'h-full w-full object-cover transition-opacity duration-500',
            state.loaded ? 'opacity-100' : 'opacity-0',
            imgClassName,
          )}
          {...rest}
        />
      )}
      {!showImg &&
        (fallback ?? (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-surface-2 to-surface p-3 text-center">
            <span className="line-clamp-4 font-display text-sm text-muted">{title || alt}</span>
          </div>
        ))}
    </div>
  )
}
