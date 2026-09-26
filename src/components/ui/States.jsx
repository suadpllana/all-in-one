import { cn } from '../../lib/cn'
import Icon from './Icon'
import { Button } from './Button'

// Friendly failure block: missing API key, rate limit, network, HTTP.
export function ErrorState({ error, onRetry, compact, className }) {
  const missingKey = error?.code === 'missing_key'
  const rateLimited = error?.code === 'rate_limited'
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-surface/60 text-center',
        compact ? 'gap-2 px-6 py-8' : 'gap-3 px-8 py-14',
        className,
      )}
    >
      <span className="grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
        <Icon name={missingKey ? 'key' : rateLimited ? 'hourglass' : 'alert'} className="h-6 w-6" />
      </span>
      <p className="font-display text-lg text-fg">
        {missingKey ? 'This world needs a key' : rateLimited ? 'Slow down a little' : 'Couldn’t load this'}
      </p>
      <p className="max-w-sm text-sm text-muted">{error?.message || 'Something went wrong loading this content.'}</p>
      {!missingKey && onRetry && (
        <Button variant="primary" size="sm" icon="refresh" onClick={onRetry} className="mt-1">
          Try again
        </Button>
      )}
    </div>
  )
}

// Empty list / no results. `action` is { label, onClick } or { label, to } via a
// rendered element passed as `children`.
export function EmptyState({ icon = 'sparkles', title, hint, children, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-line bg-surface/50 px-8 py-16 text-center',
        className,
      )}
    >
      <span className="grid h-16 w-16 place-items-center rounded-full bg-accent-soft text-accent ring-8 ring-accent-soft/40">
        <Icon name={icon} className="h-7 w-7" />
      </span>
      <p className="mt-2 font-display text-2xl text-fg">{title}</p>
      {hint && <p className="max-w-md text-sm leading-relaxed text-muted">{hint}</p>}
      {children && <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  )
}
