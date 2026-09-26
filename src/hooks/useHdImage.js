import { useEffect, useState } from 'react'

// Some sources (RAWG) return thumbnail-sized "backdrops" that turn into a
// blurry mess stretched across a banner. Probe candidates in order and
// resolve to the first one at least `minWidth` px wide (else the first).
const cache = new Map()

function probeWidth(url) {
  if (cache.has(url)) return cache.get(url)
  const p = new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img.naturalWidth)
    img.onerror = () => resolve(0)
    img.src = url
  })
  cache.set(url, p)
  return p
}

export function useHdImage(candidates, minWidth = 960) {
  const key = candidates.filter(Boolean).join('|')
  const [best, setBest] = useState({ key: null, url: null })

  useEffect(() => {
    let cancelled = false
    const list = key ? key.split('|') : []
    ;(async () => {
      for (const url of list) {
        if ((await probeWidth(url)) >= minWidth) {
          if (!cancelled) setBest({ key, url })
          return
        }
      }
      if (!cancelled) setBest({ key, url: list[0] || null })
    })()
    return () => {
      cancelled = true
    }
  }, [key, minWidth])

  return best.key === key ? best.url : null
}
