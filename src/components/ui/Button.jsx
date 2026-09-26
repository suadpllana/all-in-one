import { cn } from '../../lib/cn'
import Icon from './Icon'

const VARIANTS = {
  primary:
    'bg-accent text-on-accent shadow-[0_12px_30px_-14px_var(--accent)] hover:brightness-110',
  grad: 'bg-accent-grad text-on-accent shadow-[0_12px_30px_-14px_var(--accent)] hover:brightness-110',
  // The big bright CTA on dark cinematic heroes.
  light: 'bg-white text-black hover:bg-white/85',
  glass:
    'bg-white/12 text-white ring-1 ring-inset ring-white/25 backdrop-blur-md hover:bg-white/22',
  surface: 'bg-surface-2 text-fg ring-1 ring-inset ring-line hover:ring-accent-line hover:bg-surface',
  outline: 'text-fg ring-1 ring-inset ring-line hover:ring-accent hover:text-accent',
  ghost: 'text-fg-2 hover:bg-surface-2 hover:text-fg',
  soft: 'bg-accent-soft text-accent hover:brightness-125',
  danger: 'text-red-400 ring-1 ring-inset ring-red-500/40 hover:bg-red-500/10',
}

const SIZES = {
  xs: 'h-7 gap-1 px-2.5 text-xs',
  sm: 'h-8 gap-1.5 px-3 text-[13px]',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2.5 px-6 text-[15px]',
}

const ICON_SIZES = { xs: 'h-3.5 w-3.5', sm: 'h-4 w-4', md: 'h-[18px] w-[18px]', lg: 'h-5 w-5' }

export function Button({
  as: Comp = 'button',
  variant = 'surface',
  size = 'md',
  icon,
  iconRight,
  className,
  children,
  ...rest
}) {
  return (
    <Comp
      {...(Comp === 'button' ? { type: 'button' } : {})}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-ui font-semibold transition-all duration-200 active:scale-[.97] disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} className={ICON_SIZES[size]} strokeWidth={2} />}
      {children}
      {iconRight && <Icon name={iconRight} className={ICON_SIZES[size]} strokeWidth={2} />}
    </Comp>
  )
}

const ICON_BTN = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-12 w-12' }

// Round icon-only button. `label` is required for accessibility.
export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  active,
  className,
  iconClassName,
  ...rest
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-full transition-all duration-200 active:scale-90 disabled:opacity-40',
        VARIANTS[variant],
        ICON_BTN[size],
        className,
      )}
      {...rest}
    >
      <Icon name={icon} className={iconClassName || ICON_SIZES[size]} strokeWidth={2} />
    </button>
  )
}
