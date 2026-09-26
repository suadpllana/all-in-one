import { useEffect, useRef } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { CATEGORIES } from '../../config/categories'
import { useScrolled } from '../../hooks/useScrolled'
import { cn } from '../../lib/cn'
import Icon from '../ui/Icon'
import AvatarMenu from './AvatarMenu'
import Logo from './Logo'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

// Global bar: brand, the seven worlds (each lights up in its own colour),
// search and account. Transparent over heroes, frosted once scrolled.
export default function TopBar({ onSearch }) {
  const scrolled = useScrolled(12)
  const nav = useRef(null)
  const { pathname } = useLocation()

  // On phones the worlds scroll sideways — keep the current one in view.
  useEffect(() => {
    const el = nav.current
    const active = el?.querySelector('[aria-current="page"]')
    if (!el || !active || el.scrollWidth <= el.clientWidth) return
    el.scrollTo({ left: active.offsetLeft - (el.clientWidth - active.offsetWidth) / 2, behavior: 'smooth' })
  }, [pathname])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 h-14 border-b transition-[background-color,border-color,box-shadow] duration-300 md:h-16',
        scrolled
          ? 'glass border-line/60 shadow-[0_12px_32px_-24px_rgba(0,0,0,.7)]'
          : 'border-transparent bg-gradient-to-b from-bg/70 to-transparent',
      )}
    >
      <div className="shell flex h-full items-center gap-3 md:gap-5">
        <Link to="/" aria-label="Vault — home" className="flex shrink-0 items-center gap-2.5">
          <Logo className="h-8 w-8 md:h-9 md:w-9" />
          <span className="hidden text-[19px] font-extrabold tracking-[-0.04em] text-fg lg:block">Vault</span>
        </Link>

        <nav
          ref={nav}
          aria-label="Worlds"
          className="no-scrollbar relative -my-2 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-2 max-md:pr-8 max-md:[mask-image:linear-gradient(to_right,#000_calc(100%-40px),transparent)]"
        >
          <NavItem to="/" end icon="home" label="Home" className="hidden md:flex" />
          {CATEGORIES.map((c) => (
            <NavItem key={c.key} to={c.route} icon={c.icon} label={c.short} accent={c.accent} />
          ))}
        </nav>

        <button
          type="button"
          onClick={onSearch}
          className="hidden h-10 w-52 shrink-0 items-center gap-2.5 rounded-ui bg-surface-2/70 px-3 text-sm text-muted ring-1 ring-line transition-colors hover:text-fg hover:ring-accent-line md:flex xl:w-64"
        >
          <Icon name="search" className="h-4 w-4" />
          <span className="truncate">Search everything…</span>
          <kbd className="ml-auto rounded-md bg-surface px-1.5 py-0.5 text-[11px] font-semibold text-muted ring-1 ring-line">
            {isMac ? '⌘K' : 'Ctrl K'}
          </kbd>
        </button>
        <div className="hidden md:block">
          <AvatarMenu />
        </div>
      </div>
    </header>
  )
}

function NavItem({ to, end, icon, label, accent, className }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={label}
      className={({ isActive }) =>
        cn(
          'group relative flex h-9 shrink-0 items-center gap-2 rounded-ui px-2.5 text-sm font-semibold transition-colors',
          isActive ? 'bg-accent-soft text-accent' : 'text-fg-2 hover:bg-surface-2/70 hover:text-fg',
          className,
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className="relative">
            <Icon name={icon} className="h-[18px] w-[18px]" strokeWidth={2} />
            {/* Each world previews its colour on hover. */}
            {accent && !isActive && (
              <span
                className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                style={{ background: accent }}
              />
            )}
          </span>
          <span className={cn(isActive ? 'inline' : 'hidden max-md:inline xl:inline')}>{label}</span>
        </>
      )}
    </NavLink>
  )
}
