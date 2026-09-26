import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { getApi } from '../../api'
import { useItemActions } from '../../hooks/useItemActions'
import { cn } from '../../lib/cn'
import { toast } from '../../lib/toast'
import { Button } from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Img from '../../components/ui/Img'
import { VideoModal } from '../../components/ui/Modal'
import Rail from '../../components/ui/Rail'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/States'
import { StarRatingInput } from '../../components/ui/Stars'

// Building blocks shared by the per-world detail pages. Each world composes
// them into its own layout.

export function BackButton({ fallback = '/', className, glass = true }) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate(fallback))}
      className={cn(
        'group inline-flex h-9 items-center gap-1.5 rounded-full pl-2.5 pr-4 text-sm font-semibold transition-all hover:-translate-x-0.5 active:scale-95',
        glass
          ? 'bg-black/35 text-white ring-1 ring-white/15 backdrop-blur-md hover:bg-black/55'
          : 'bg-surface-2 text-fg ring-1 ring-line hover:ring-accent-line',
        className,
      )}
    >
      <Icon name="chevronLeft" className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" strokeWidth={2.4} />
      Back
    </button>
  )
}

export function DetailError({ error, onRetry, fallback }) {
  return (
    <div className="shell py-10">
      <BackButton fallback={fallback} glass={false} />
      <ErrorState error={error} onRetry={onRetry} className="mt-6" />
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div>
      <Skeleton className="-mt-16 h-[62vh] min-h-[420px] w-full rounded-none" />
      <div className="shell -mt-40 flex gap-8">
        <Skeleton className="hidden aspect-[2/3] w-60 shrink-0 rounded-card md:block" />
        <div className="flex-1 space-y-4 pt-24">
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-10 w-80 rounded-ui" />
          <Skeleton className="h-4 w-full max-w-2xl" />
          <Skeleton className="h-4 w-5/6 max-w-2xl" />
        </div>
      </div>
    </div>
  )
}

// Long synopsis clamped to a few lines with a toggle.
export function ExpandableText({ text, lines = 5, className }) {
  const [open, setOpen] = useState(false)
  if (!text) return null
  const long = text.length > lines * 110
  return (
    <div className={className}>
      <p
        className={cn('whitespace-pre-line', !open && long && 'overflow-hidden')}
        style={!open && long ? { display: '-webkit-box', WebkitLineClamp: lines, WebkitBoxOrient: 'vertical' } : undefined}
      >
        {text}
      </p>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mt-2 text-sm font-bold text-accent hover:underline"
        >
          {open ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  )
}

// Label / value list for the facts sidebar. Empty values are skipped.
export function Facts({ rows, className }) {
  const shown = rows.filter(([, v]) => v != null && v !== '' && !(Array.isArray(v) && !v.length))
  if (!shown.length) return null
  return (
    <dl className={cn('divide-y divide-line', className)}>
      {shown.map(([k, v]) => (
        <div key={k} className="flex items-start justify-between gap-6 py-3 text-sm">
          <dt className="shrink-0 text-muted">{k}</dt>
          <dd className="text-right font-medium text-fg">{Array.isArray(v) ? v.join(', ') : v}</dd>
        </div>
      ))}
    </dl>
  )
}

// People with photos (cast, crew, characters). `round` for portraits in a
// circle (film/TV credits); otherwise tall cards.
export function PeopleRail({ people, round = false, label = 'Cast', inset = false }) {
  if (!people?.length) return null
  return (
    <Rail label={label} gap="gap-4" inset={inset}>
      {people.map((p, i) => (
        <div key={`${p.name}-${i}`} role="listitem" className={cn('shrink-0 snap-start', round ? 'w-[104px] text-center sm:w-[116px]' : 'w-[128px]')}>
          <Img
            src={p.photo}
            alt=""
            className={cn('bg-surface-2 ring-1 ring-line', round ? 'mx-auto aspect-square w-full rounded-full' : 'aspect-[3/4] w-full rounded-card')}
            fallback={
              <div className="grid h-full w-full place-items-center bg-gradient-to-br from-surface-2 to-surface font-display text-2xl text-muted">
                {initials(p.name)}
              </div>
            }
          />
          <p className="mt-2.5 line-clamp-2 text-[13px] font-semibold leading-tight text-fg">{p.name}</p>
          {p.role && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{p.role}</p>}
        </div>
      ))}
    </Rail>
  )
}

const initials = (name = '') =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

// "Your rating" with half-star input. Rating an unsaved item marks it done.
export function RatingBox({ item, label = 'Your rating', hint, className }) {
  const a = useItemActions(item)
  const stars = a.userRating != null ? (a.userRating > 5 ? a.userRating / 2 : a.userRating) : null
  return (
    <div className={cn('rounded-card bg-surface p-5 ring-1 ring-line', className)}>
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-xl text-fg">{label}</h3>
        {stars != null && <span className="text-sm font-bold text-gold">{stars} / 5</span>}
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      <StarRatingInput value={stars} onRate={a.rate} size={30} className="mt-3" />
    </div>
  )
}

// A few lines of your own — a review, reading notes, a hot take.
export function ReviewBox({ item, title = 'Your review', placeholder = 'What did you think?', className }) {
  const a = useItemActions(item)
  const saved = a.entry?.review || ''
  const [draft, setDraft] = useState(saved)
  const [editing, setEditing] = useState(false)
  // Pick up a review edited on another device while not editing.
  if (!editing && draft !== saved) setDraft(saved)

  return (
    <div className={cn('rounded-card bg-surface p-5 ring-1 ring-line', className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl text-fg">{title}</h3>
        {saved && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="text-sm font-semibold text-accent hover:underline">
            Edit
          </button>
        )}
      </div>
      {saved && !editing ? (
        <blockquote className="mt-3 whitespace-pre-line border-l-2 border-accent pl-4 font-read text-[15px] italic leading-relaxed text-fg-2">
          {saved}
        </blockquote>
      ) : (
        <>
          <textarea
            value={draft}
            onFocus={() => setEditing(true)}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder={placeholder}
            className="mt-3 w-full resize-y rounded-[min(var(--r-ui),12px)] bg-surface-2 p-3 font-read text-[15px] leading-relaxed text-fg outline-none ring-1 ring-line placeholder:text-muted focus:ring-2 focus:ring-accent"
          />
          {editing && (
            <div className="mt-2 flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDraft(saved)
                  setEditing(false)
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  a.setReview(draft)
                  setEditing(false)
                }}
              >
                Save
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function TrailerButton({ videoKey, label = 'Play trailer', variant = 'light', size = 'lg', className, title }) {
  const [open, setOpen] = useState(false)
  if (!videoKey) return null
  return (
    <>
      <Button variant={variant} size={size} icon="playFill" onClick={() => setOpen(true)} className={className}>
        {label}
      </Button>
      <VideoModal videoKey={open ? videoKey : null} title={title || label} onClose={() => setOpen(false)} />
    </>
  )
}

// For list items (heroes): fetches the detail on demand for its trailer key.
export function LazyTrailerButton({ item, label = 'Play trailer', variant = 'light', size = 'lg', className }) {
  const qc = useQueryClient()
  const [videoKey, setVideoKey] = useState(null)
  const [loading, setLoading] = useState(false)
  async function play() {
    setLoading(true)
    try {
      const d = await qc.fetchQuery({
        queryKey: ['detail', item.category, item.externalId],
        queryFn: ({ signal }) => getApi(item.category).detail(item.externalId, signal),
        staleTime: 30 * 60 * 1000,
      })
      if (d?.trailerKey) setVideoKey(d.trailerKey)
      else toast('No trailer for this one yet', { icon: 'info' })
    } catch {
      toast('Couldn’t load the trailer', { icon: 'alert' })
    } finally {
      setLoading(false)
    }
  }
  return (
    <>
      <Button variant={variant} size={size} icon="playFill" onClick={play} disabled={loading} className={className}>
        {loading ? 'Loading…' : label}
      </Button>
      <VideoModal videoKey={videoKey} title={`${item.title} — trailer`} onClose={() => setVideoKey(null)} />
    </>
  )
}

export function Chips({ items, className, onClick }) {
  if (!items?.length) return null
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {items.map((g) => (
        <span
          key={g}
          onClick={onClick ? () => onClick(g) : undefined}
          className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent"
        >
          {g}
        </span>
      ))}
    </div>
  )
}
