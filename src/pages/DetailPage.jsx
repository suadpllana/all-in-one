import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getApi } from '../api'
import { CATEGORY_BY_KEY, applyCategoryTheme } from '../config/categories'
import { useLibrary } from '../hooks/useLibrary'
import { useOpenDetail } from '../hooks/useOpenDetail'
import StatusDropdown from '../components/StatusDropdown'
import Carousel from '../components/Carousel'
import { Skeleton, CardRowSkeleton } from '../components/Skeleton'
import { ErrorState } from '../components/states'

// Full-page, cinematic detail view for a single item (/{category}/{id}).
export default function DetailPage({ categoryKey }) {
  const category = CATEGORY_BY_KEY[categoryKey]
  const { segment: id } = useParams()
  const navigate = useNavigate()
  const { getEntry, setRating } = useLibrary()

  // Keep the category theme even when deep-linked straight to a detail page.
  useEffect(() => {
    applyCategoryTheme(category)
    return () => delete document.documentElement.dataset.category
  }, [category])

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['detail', categoryKey, id],
    queryFn: ({ signal }) => getApi(categoryKey).detail(id, signal),
    staleTime: 30 * 60 * 1000,
  })

  useEffect(() => {
    if (data?.title) document.title = `${data.title} · Vault`
  }, [data])

  if (error) {
    return (
      <div className="py-10">
        <BackButton onClick={() => navigate(-1)} />
        <div className="mt-6">
          <ErrorState error={error} onRetry={refetch} />
        </div>
      </div>
    )
  }

  if (isLoading || !data) return <DetailSkeleton onBack={() => navigate(-1)} />

  const d = data
  const entry = getEntry(category.key, d.externalId)

  return (
    <div className="-mt-4">
      {/* ---- Cinematic hero ------------------------------------------- */}
      <section className="relative -mx-4 overflow-hidden md:-mx-8">
        <div className="absolute inset-0">
          {(d.backdropUrl || d.posterUrl) && (
            <img
              src={d.backdropUrl || d.posterUrl}
              alt=""
              className="h-full w-full scale-105 object-cover object-top blur-[2px] brightness-[.55]"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/70 to-[var(--color-bg)]/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-bg)]/90 via-transparent to-transparent" />
          <div
            className="absolute inset-x-0 bottom-0 h-40"
            style={{ background: `linear-gradient(to top, ${category.accentSoft}, transparent)` }}
          />
        </div>

        <div className="relative mx-auto max-w-[1400px] px-4 pb-8 pt-6 md:px-8">
          <BackButton onClick={() => navigate(-1)} />

          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end md:mt-10 md:gap-8">
            {/* Poster */}
            <div className="w-40 shrink-0 sm:w-52 md:w-60">
              <div className="aspect-[2/3] overflow-hidden rounded-2xl shadow-2xl shadow-black/60 ring-1 ring-white/10">
                {d.posterUrl ? (
                  <img src={d.posterUrl} alt={d.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-[var(--color-surface-2)] p-3 text-center text-sm text-[var(--color-muted)]">
                    {d.title}
                  </div>
                )}
              </div>
            </div>

            {/* Title block */}
            <div className="min-w-0 flex-1 pb-1">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-lg">{category.icon}</span>
                <span
                  className="text-xs font-bold uppercase tracking-[0.2em]"
                  style={{ color: category.accent }}
                >
                  {category.label}
                </span>
              </div>

              <h1 className="text-3xl font-black leading-[1.05] tracking-tight drop-shadow-lg md:text-5xl">
                {d.title}
              </h1>
              {d.tagline && (
                <p className="mt-2 max-w-2xl text-base italic text-white/70 md:text-lg">
                  {d.tagline}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {d.rating != null && <RatingBadge value={d.rating} accent={category.accent} />}
                {metaChips(d).map((m) => (
                  <span
                    key={m}
                    className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm font-medium text-white/85 backdrop-blur"
                  >
                    {m}
                  </span>
                ))}
              </div>

              {Array.isArray(d.genres) && d.genres.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {d.genres.slice(0, 6).map((g) => (
                    <span
                      key={g}
                      className="rounded-full px-3 py-1 text-xs font-semibold"
                      style={{ backgroundColor: category.accentSoft, color: category.accent }}
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="w-52">
                  <StatusDropdown item={d} variant="detail" />
                </div>
                {entry?.user_rating != null && (
                  <span className="text-sm text-[var(--color-muted)]">
                    Your rating: <span className="font-bold text-accent">{entry.user_rating}/10</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Body ----------------------------------------------------- */}
      <section className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          {d.overview && (
            <div>
              <SectionTitle>Overview</SectionTitle>
              <p className="max-w-3xl text-[15px] leading-relaxed text-white/85">{d.overview}</p>
            </div>
          )}

          {d.people?.length > 0 && (
            <div>
              <SectionTitle>{peopleLabel(category.key)}</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {d.people.map((p) => (
                  <span
                    key={p}
                    className="rounded-lg bg-[var(--color-surface)] px-3 py-2 text-sm ring-1 ring-[var(--color-border)]"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          <RatingPanel item={d} entry={entry} onRate={(n) => setRating(d, n)} />

          <MoreLikeThis category={category} item={d} />
        </div>

        {/* Facts sidebar */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--color-muted)]">
              Details
            </h3>
            <dl className="space-y-3 text-sm">
              {factRows(d, category).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="shrink-0 text-[var(--color-muted)]">{label}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>
      </section>
    </div>
  )
}

/* -------------------------------------------------------------------- */

function MoreLikeThis({ category, item }) {
  const genres = item.genreIds || []
  const openDetail = useOpenDetail()

  const { data } = useQuery({
    queryKey: ['more-like', category.key, item.externalId, genres],
    queryFn: ({ signal }) =>
      genres.length
        ? getApi(category.key).byGenres(genres, signal)
        : getApi(category.key).trending(signal),
    staleTime: 30 * 60 * 1000,
    retry: 0,
  })

  const items = (data || []).filter((i) => i.externalId !== item.externalId).slice(0, 18)
  if (items.length === 0) return null

  return (
    <div>
      <SectionTitle>More like this</SectionTitle>
      <Carousel items={items} onOpen={openDetail} />
    </div>
  )
}

function RatingPanel({ entry, onRate }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="text-sm font-bold">Your rating</h3>
      <p className="mb-3 mt-0.5 text-xs text-[var(--color-muted)]">
        {entry ? 'Tap a score to rate.' : 'Rating this adds it to your library.'}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => onRate(n)}
            style={n === entry?.user_rating ? { backgroundColor: 'var(--accent)' } : undefined}
            className={`h-9 w-9 rounded-lg text-sm font-bold transition-colors ${
              n === entry?.user_rating
                ? 'text-white'
                : 'bg-[var(--color-surface-2)] hover:bg-[var(--color-border)]'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

function RatingBadge({ value, accent }) {
  const pct = Math.round((value / 10) * 100)
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/40 py-1 pl-1 pr-3 backdrop-blur">
      <div className="relative grid h-9 w-9 place-items-center">
        <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="3" />
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke={accent}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 94.2} 94.2`}
          />
        </svg>
        <span className="absolute text-[11px] font-black">{value.toFixed(1)}</span>
      </div>
      <span className="text-sm font-semibold text-white/85">Rating</span>
    </div>
  )
}

function BackButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-sm font-medium text-white/90 backdrop-blur transition-colors hover:bg-black/60"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m15 18-6-6 6-6" />
      </svg>
      Back
    </button>
  )
}

function SectionTitle({ children }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-xl font-bold tracking-tight">
      <span className="h-5 w-1 rounded-full bg-accent" />
      {children}
    </h2>
  )
}

function DetailSkeleton({ onBack }) {
  return (
    <div className="-mt-4">
      <section className="relative -mx-4 md:-mx-8">
        <div className="mx-auto max-w-[1400px] px-4 pb-8 pt-6 md:px-8">
          <BackButton onClick={onBack} />
          <div className="mt-6 flex flex-col gap-6 sm:flex-row md:mt-10 md:gap-8">
            <Skeleton className="aspect-[2/3] w-40 rounded-2xl sm:w-52 md:w-60" />
            <div className="flex-1 space-y-4 pt-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-64 rounded-full" />
              <Skeleton className="h-10 w-52 rounded-lg" />
            </div>
          </div>
        </div>
      </section>
      <div className="mt-8 space-y-3">
        <Skeleton className="h-4 w-full max-w-3xl" />
        <Skeleton className="h-4 w-11/12 max-w-3xl" />
        <Skeleton className="h-4 w-2/3 max-w-3xl" />
        <div className="pt-6">
          <CardRowSkeleton />
        </div>
      </div>
    </div>
  )
}

/* ---- helpers ------------------------------------------------------- */

function metaChips(d) {
  const out = []
  if (d.year) out.push(String(d.year))
  if (d.runtime) out.push(`${d.runtime} min`)
  if (d.seasons) out.push(`${d.seasons} season${d.seasons > 1 ? 's' : ''}`)
  if (d.episodes) out.push(`${d.episodes} episodes`)
  if (d.pageCount) out.push(`${d.pageCount} pages`)
  if (d.playtime) out.push(`~${d.playtime}h`)
  return out
}

function factRows(d, category) {
  const rows = []
  if (d.year) rows.push(['Year', d.year])
  if (d.runtime) rows.push([category.key === 'anime' ? 'Ep. length' : 'Runtime', `${d.runtime} min`])
  if (d.seasons) rows.push(['Seasons', d.seasons])
  if (d.episodes) rows.push(['Episodes', d.episodes])
  if (d.pageCount) rows.push(['Pages', d.pageCount])
  if (d.playtime) rows.push(['Avg. playtime', `${d.playtime} h`])
  if (d.creators?.length) rows.push([creatorLabel(category.key), d.creators.join(', ')])
  if (d.views != null) rows.push(['Views', d.views.toLocaleString()])
  if (d.publisher && category.key !== 'youtube') rows.push(['Publisher', d.publisher])
  if (d.platforms?.length) rows.push(['Platforms', d.platforms.join(', ')])
  if (d.rating != null) rows.push(['Score', `${d.rating.toFixed(1)} / 10`])
  return rows
}

function creatorLabel(cat) {
  return (
    { book: 'Author', game: 'Developer', anime: 'Studio', youtube: 'Channel' }[cat] ||
    'Director / Creator'
  )
}
function peopleLabel(cat) {
  return { book: 'Author', game: 'Developer', anime: 'Studio', youtube: 'Channel' }[cat] || 'Cast'
}
