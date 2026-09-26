import { useEffect } from 'react'
import Modal from './Modal'
import { IconButton } from './Button'

// Full-screen image viewer with prev/next (buttons and ← →) and a counter.
export default function Lightbox({ images, index, onIndex, onClose, label = 'Screenshots' }) {
  const open = index != null
  const count = images.length

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'ArrowRight') onIndex((index + 1) % count)
      if (e.key === 'ArrowLeft') onIndex((index - 1 + count) % count)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, index, count, onIndex])

  return (
    <Modal open={open} onClose={onClose} label={label} className="w-[min(94vw,1400px)]">
      {open && (
        <figure className="relative">
          <img src={images[index]} alt={`${label} ${index + 1} of ${count}`} className="max-h-[82vh] w-full rounded-xl object-contain shadow-2xl" />
          <figcaption className="mt-3 text-center text-sm font-semibold text-white/70">
            {index + 1} / {count}
          </figcaption>
          {count > 1 && (
            <>
              <IconButton
                icon="chevronLeft"
                label="Previous"
                variant="glass"
                size="lg"
                onClick={() => onIndex((index - 1 + count) % count)}
                className="absolute left-3 top-1/2 -translate-y-1/2"
              />
              <IconButton
                icon="chevronRight"
                label="Next"
                variant="glass"
                size="lg"
                onClick={() => onIndex((index + 1) % count)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              />
            </>
          )}
        </figure>
      )}
    </Modal>
  )
}
