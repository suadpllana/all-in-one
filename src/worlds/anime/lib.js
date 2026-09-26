import { FORMAT_LABEL } from '../../api/anime'
import { useNow } from '../../hooks/useNow'
import { countdown } from '../../lib/format'

// "Ep 5 in 2d 4h" for currently airing series.
export function useAiring(item) {
  const now = useNow(60_000)
  const next = item?.nextAiring
  if (!next?.airingAt) return null
  const secs = Math.max(0, Math.round((next.airingAt - now) / 1000))
  return { episode: next.episode, in: countdown(secs), secs, at: next.airingAt }
}

export function formatLine(item) {
  return [FORMAT_LABEL[item.format] || item.format, item.episodes ? `${item.episodes} eps` : null, item.studios?.[0]]
    .filter(Boolean)
    .join(' · ')
}
