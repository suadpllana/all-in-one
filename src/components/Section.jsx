import Carousel from './Carousel'
import { CardRowSkeleton } from './Skeleton'
import { ErrorState } from './states'

// A titled discovery shelf. Renders skeleton → error → carousel from a
// react-query result. Hidden entirely when empty (e.g. no recommendations yet).
export default function Section({ title, subtitle, query, onOpen, hideWhenEmpty }) {
  const { data, isLoading, error, refetch } = query

  if (isLoading) {
    return (
      <section className="space-y-3">
        <SectionHeader title={title} subtitle={subtitle} />
        <CardRowSkeleton />
      </section>
    )
  }

  if (error) {
    return (
      <section className="space-y-3">
        <SectionHeader title={title} subtitle={subtitle} />
        <ErrorState error={error} onRetry={refetch} compact />
      </section>
    )
  }

  if (!data || data.length === 0) {
    if (hideWhenEmpty) return null
    return (
      <section className="space-y-3">
        <SectionHeader title={title} subtitle={subtitle} />
        <p className="text-sm text-[var(--color-muted)]">Nothing to show here yet.</p>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <SectionHeader title={title} subtitle={subtitle} />
      <Carousel items={data} onOpen={onOpen} />
    </section>
  )
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="bg-gradient-accent h-5 w-1 rounded-full" />
      <h2 className="text-lg font-bold tracking-tight md:text-xl">{title}</h2>
      {subtitle && <p className="text-sm text-[var(--color-muted)]">{subtitle}</p>}
    </div>
  )
}
