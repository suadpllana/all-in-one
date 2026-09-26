import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import Icon from './Icon'

// Section heading in the world's display voice (marquee caps for movies,
// serif for books, techno caps for games…). Optional "See all" link.
export function SectionHeader({ title, kicker, subtitle, to, action, className, icon, count }) {
  return (
    <div className={cn('mb-3 flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {kicker && <p className="kicker mb-1.5 text-accent">{kicker}</p>}
        <h2 className="flex items-center gap-2.5 font-display text-2xl leading-none text-fg md:text-[1.75rem]">
          {icon && <Icon name={icon} className="h-5 w-5 shrink-0 text-accent md:h-6 md:w-6" />}
          <span className="truncate">{title}</span>
          {count != null && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 font-sans text-xs font-bold tracking-normal text-muted normal-case">
              {count}
            </span>
          )}
        </h2>
        {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {to && (
        <Link
          to={to}
          className="group flex shrink-0 items-center gap-1 text-sm font-semibold text-muted transition-colors hover:text-accent"
        >
          See all
          <Icon name="chevronRight" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
      {action}
    </div>
  )
}

export function Section({ children, className, ...header }) {
  return (
    <section className={cn('rise', className)}>
      {header.title && <SectionHeader {...header} />}
      {children}
    </section>
  )
}
