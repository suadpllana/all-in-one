import { useRef } from 'react'
import MediaCard from './MediaCard'

// Horizontal scroll carousel of MediaCards with arrow controls (desktop).
export default function Carousel({ items, onOpen }) {
  const scroller = useRef()

  function scrollBy(dir) {
    scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    // md:px-12 reserves a gutter on both sides so the arrows sit next to the
    // row instead of on top of the first/last card.
    <div className="relative md:px-12">
      <button
        onClick={() => scrollBy(-1)}
        aria-label="Scroll left"
        className="bg-gradient-accent absolute left-0 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-lg font-bold text-white shadow-lg transition-transform hover:scale-110 md:grid"
      >
        ‹
      </button>

      <div
        ref={scroller}
        className="no-scrollbar flex snap-x gap-4 overflow-x-auto scroll-smooth pb-2"
      >
        {items.map((item) => (
          <div
            key={`${item.category}:${item.externalId}`}
            className="w-[150px] shrink-0 snap-start sm:w-[170px]"
          >
            <MediaCard item={item} onOpen={onOpen} />
          </div>
        ))}
      </div>

      <button
        onClick={() => scrollBy(1)}
        aria-label="Scroll right"
        className="bg-gradient-accent absolute right-0 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-lg font-bold text-white shadow-lg transition-transform hover:scale-110 md:grid"
      >
        ›
      </button>
    </div>
  )
}
