import { useEffect, useRef, useState } from 'react'

// True once the element has come within `margin` of the viewport (sticky —
// stays true). Used to defer below-the-fold shelves' network requests.
export function useInView(margin = '400px') {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || inView) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          io.disconnect()
        }
      },
      { rootMargin: margin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [margin, inView])
  return [ref, inView]
}
