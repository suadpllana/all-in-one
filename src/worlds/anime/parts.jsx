import { cn } from '../../lib/cn'
import PosterCard from '../../components/cards/PosterCard'
import Icon from '../../components/ui/Icon'
import { formatLine, useAiring } from './lib'

// Anime-world pieces shared by its Discover / Library / Detail screens.

// AniList-style score: a percentage with a mood colour.
export function ScorePill({ value, className }) {
  if (value == null) return null
  const pct = Math.round(value * 10)
  const tone = pct >= 75 ? 'text-emerald-300' : pct >= 60 ? 'text-amber-300' : 'text-rose-300'
  return (
    <span className={cn('flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-extrabold backdrop-blur-md', tone, className)}>
      <Icon name={pct >= 75 ? 'heartFill' : 'starFill'} className="h-3 w-3" />
      {pct}%
    </span>
  )
}

// Poster card with score, format/episodes and a live airing ribbon.
export function AnimeCard({ item, rail, size = 'md', className }) {
  const airing = useAiring(item)
  return (
    <PosterCard
      item={item}
      rail={rail}
      size={size}
      className={className}
      topLeft={<ScorePill value={item.rating} />}
      meta={formatLine(item) || item.year}
      overlay={
        airing ? (
          <div className="flex items-center gap-1.5 bg-gradient-to-t from-black/90 to-black/40 px-2.5 pb-2 pt-5 text-[11px] font-bold text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            Ep {airing.episode} in {airing.in}
          </div>
        ) : null
      }
    />
  )
}

// Genre chip tinted per genre (stable pastel hue from the name).
export function GenreChip({ name, onClick, active, className }) {
  const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
      className={cn(
        'inline-flex h-8 shrink-0 items-center rounded-full px-3.5 text-[13px] font-bold transition-transform',
        onClick && 'hover:-translate-y-0.5',
        className,
      )}
      style={{
        background: active ? `hsl(${hue} 85% 70%)` : `hsl(${hue} 80% 70% / .16)`,
        color: active ? '#140b24' : `hsl(${hue} 90% 80%)`,
      }}
    >
      {name}
    </Tag>
  )
}

// A few sakura petals drifting across a hero (skipped with reduced motion).
const PETALS = [
  { left: '8%', size: 10, dur: 13, delay: 0 },
  { left: '22%', size: 7, dur: 16, delay: 4 },
  { left: '37%', size: 12, dur: 12, delay: 7 },
  { left: '52%', size: 8, dur: 17, delay: 2 },
  { left: '64%', size: 11, dur: 14, delay: 9 },
  { left: '78%', size: 7, dur: 15, delay: 5 },
  { left: '90%', size: 9, dur: 18, delay: 11 },
]
export function Petals() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden">
      {PETALS.map((p, i) => (
        <span
          key={i}
          className="absolute -top-6 rounded-[100%_0_100%_0] bg-gradient-to-br from-pink-100 to-pink-400 opacity-70 shadow-[0_0_6px_rgba(255,160,200,.6)]"
          style={{
            left: p.left,
            width: p.size,
            height: p.size * 0.8,
            animation: `drift ${p.dur}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}
