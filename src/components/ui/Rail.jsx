import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import Icon from './Icon'

// Horizontal, snap-scrolling row that bleeds to the viewport edges (it
// cancels the .shell padding) with hover arrows on desktop. Children are the
// items; give them a width and `shrink-0`. `inset` is for a rail in a main
// column beside a sidebar: from lg up it stops at the column's right edge and
// fades out there instead of running into the sidebar.
export default function Rail({ children, className, gap = 'gap-4', label, arrowTop = '42%', inset = false }) {
  const ref = useRef(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    const left = el.scrollLeft > 8
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 8
    setEdges((e) => (e.left === left && e.right === right ? e : { left, right }))
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [update, children])

  const scroll = (dir) => {
    const el = ref.current
    el?.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' })
  }

  return (
    <div className="group/rail relative">
      <div
        ref={ref}
        onScroll={update}
        role="list"
        aria-label={label}
        className={cn(
          'no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 overflow-x-auto px-4 pb-5 pt-2 md:-mx-8 md:scroll-px-8 md:px-8',
          inset ? 'lg:mr-0 lg:pr-0 xl:-ml-12 xl:pl-12 xl:scroll-pl-12' : 'xl:-mx-12 xl:scroll-px-12 xl:px-12',
          inset && edges.right && 'lg:fade-r',
          gap,
          className,
        )}
      >
        {children}
      </div>
      {edges.left && <RailArrow dir={-1} top={arrowTop} onClick={() => scroll(-1)} />}
      {edges.right && <RailArrow dir={1} top={arrowTop} onClick={() => scroll(1)} />}
    </div>
  )
}

function RailArrow({ dir, onClick, top }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir < 0 ? 'Scroll left' : 'Scroll right'}
      style={{ top }}
      className={cn(
        'absolute z-20 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-surface/90 text-fg opacity-0 shadow-xl ring-1 ring-line backdrop-blur transition-all duration-200 hover:scale-110 hover:bg-accent hover:text-on-accent group-hover/rail:opacity-100 md:grid',
        dir < 0 ? '-left-3 xl:-left-6' : '-right-3 xl:-right-6',
      )}
    >
      <Icon name={dir < 0 ? 'chevronLeft' : 'chevronRight'} className="h-5 w-5" strokeWidth={2.4} />
    </button>
  )
}
