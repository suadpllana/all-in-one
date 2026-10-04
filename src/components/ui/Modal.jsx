import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn'
import { IconButton } from './Button'

// Portal dialog: dimmed backdrop, Escape / backdrop-click to close, body
// scroll lock, focus moved into the dialog and restored on close.
export default function Modal({ open, onClose, label, children, className, bare = false }) {
  const ref = useRef(null)
  // Latest onClose without re-running the open effect (which would steal
  // focus back to the panel) when a parent passes a new callback each render.
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const prevFocus = document.activeElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    function onKey(e) {
      if (e.key === 'Escape') closeRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
      prevFocus?.focus?.()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6"
    >
      <div className="fade-in absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div ref={ref} tabIndex={-1} className={cn('rise relative max-h-full outline-none', className)}>
        {!bare && (
          <IconButton
            icon="x"
            label="Close"
            variant="glass"
            onClick={onClose}
            className="absolute -top-3 -right-3 z-10 sm:-top-4 sm:-right-4"
          />
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}

// YouTube trailer / video in a letterboxed 16:9 frame.
export function VideoModal({ videoKey, title = 'Trailer', onClose }) {
  return (
    <Modal open={Boolean(videoKey)} onClose={onClose} label={title} className="w-[min(94vw,1180px)]">
      <div className="aspect-video overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10">
        {videoKey && (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoKey}?autoplay=1&rel=0&modestbranding=1`}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="h-full w-full"
          />
        )}
      </div>
    </Modal>
  )
}
