import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { bookThickness } from '../../lib/format'
import { detailPath } from '../../lib/paths'
import { useNow } from '../../hooks/useNow'
import { usePref } from '../../hooks/usePref'
import { Button } from '../../components/ui/Button'
import Img from '../../components/ui/Img'
import { ProgressRing } from '../../components/ui/Progress'

// Books-world pieces shared by Discover / Library / Detail.

// Big 3D book for heroes and the detail page.
export function Book3D({ item, className, eager }) {
  return (
    <div className={cn('book3d', className)} style={{ '--thick': `${Math.round(bookThickness(item.pageCount) * 1.6)}px` }}>
      <div className="cover aspect-[2/3] bg-surface-2">
        <Img src={item.posterUrl} title={item.title} eager={eager} className="h-full w-full" />
      </div>
      <div className="pages" />
    </div>
  )
}

// The yearly reading challenge: finished this year vs. goal, and whether
// you're ahead of the pace.
export function ReadingChallenge({ readThisYear, compact = false, className }) {
  const year = new Date().getFullYear()
  const [goal] = usePref(`book.goal.${year}`, 24)
  const now = useNow(60 * 60 * 1000)
  const start = new Date(year, 0, 1).getTime()
  const end = new Date(year + 1, 0, 1).getTime()
  const elapsed = Math.min(1, Math.max(0, (now - start) / (end - start)))
  const expected = Math.floor(goal * elapsed)
  const diff = readThisYear - expected
  const pace =
    readThisYear >= goal
      ? 'Goal reached — anything more is a bonus.'
      : diff > 0
        ? `${diff} book${diff === 1 ? '' : 's'} ahead of schedule`
        : diff < 0
          ? `${-diff} book${diff === -1 ? '' : 's'} behind schedule`
          : 'Right on schedule'

  return (
    <div className={cn('paper flex items-center gap-5 rounded-2xl p-5 ring-1 ring-line', className)}>
      <ProgressRing value={readThisYear / goal} size={compact ? 76 : 96} stroke={compact ? 7 : 9} track="rgba(120, 90, 60, .15)">
        <span className="text-center leading-none">
          <span className="block font-display text-2xl text-fg">{readThisYear}</span>
          <span className="text-[11px] font-semibold text-muted">of {goal}</span>
        </span>
      </ProgressRing>
      <div className="min-w-0">
        <p className="kicker text-accent">{year} reading challenge</p>
        <p className="mt-1 font-display text-xl leading-snug text-fg">
          {readThisYear} book{readThisYear === 1 ? '' : 's'} read
        </p>
        <p className="mt-0.5 text-sm text-muted">{pace}</p>
        {!compact && (
          <Button as={Link} to="/account" variant="ghost" size="xs" className="mt-1.5 -ml-2.5">
            Change goal
          </Button>
        )}
      </div>
    </div>
  )
}

export function AuthorLine({ authors, className }) {
  if (!authors?.length) return null
  return (
    <p className={cn('font-display italic text-fg-2', className)}>
      by{' '}
      {authors.map((a, i) => (
        <span key={a}>
          {i > 0 && (i === authors.length - 1 ? ' & ' : ', ')}
          <Link to={`/books?q=${encodeURIComponent(a)}`} className="not-italic font-semibold text-fg underline decoration-accent/40 decoration-2 underline-offset-4 hover:decoration-accent">
            {a}
          </Link>
        </span>
      ))}
    </p>
  )
}

export function BookLink({ item, children, className }) {
  return (
    <Link to={detailPath(item)} className={className}>
      {children}
    </Link>
  )
}
