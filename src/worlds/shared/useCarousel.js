import { useEffect, useState } from 'react'

// Auto-advancing slide index for heroes. Pauses on hover (setPaused) and in
// background tabs; manual navigation restarts the timer (epoch) so it doesn't
// jump right after a click.
export function useCarousel(count, { interval = 8000 } = {}) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [epoch, setEpoch] = useState(0)

  useEffect(() => {
    if (count < 2 || paused) return
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') setIndex((i) => (i + 1) % count)
    }, interval)
    return () => clearInterval(t)
  }, [count, paused, interval, epoch])

  const safe = count ? index % count : 0
  const go = (i) => {
    if (!count) return
    setIndex(((i % count) + count) % count)
    setEpoch((e) => e + 1)
  }
  return { index: safe, go, next: () => go(safe + 1), prev: () => go(safe - 1), paused, setPaused, epoch, interval }
}
