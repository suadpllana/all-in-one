import { useEffect, useState } from 'react'

// Current time that re-renders every `intervalMs` — keeps countdowns
// ("Ep 5 in 2d 4h") live without calling Date.now() during render.
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}
