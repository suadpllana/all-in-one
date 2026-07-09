import { NavLink } from 'react-router-dom'
import { CATEGORIES } from '../config/categories'
import { cn } from '../lib/cn'
import GlobalSearch from './GlobalSearch'
import AvatarMenu from './AvatarMenu'

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-3 md:px-8">
        {/* Wordmark — the tile picks up the active category's gradient. */}
        <NavLink to="/movies" className="flex shrink-0 items-center gap-2">
          <span className="bg-gradient-accent grid h-8 w-8 place-items-center rounded-xl text-sm font-black text-white shadow-lg">
            V
          </span>
          <span className="hidden text-lg font-black tracking-tight lg:block">Vault</span>
        </NavLink>

        {/* Category tabs — hidden on mobile (bottom nav takes over) */}
        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {CATEGORIES.map((c) => (
            <NavLink
              key={c.key}
              to={c.route}
              style={({ isActive }) =>
                isActive
                  ? { color: c.accent, backgroundColor: c.accentSoft }
                  : undefined
              }
              className={({ isActive }) =>
                cn(
                  'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive ? '' : 'text-[var(--color-muted)] hover:text-[var(--color-text)]',
                )
              }
            >
              {c.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <GlobalSearch />
          <AvatarMenu />
        </div>
      </div>
    </header>
  )
}
