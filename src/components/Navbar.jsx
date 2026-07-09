import { NavLink } from 'react-router-dom'
import { CATEGORIES } from '../config/categories'
import { useCompletedCounts } from '../hooks/useCompletedCounts'
import { cn } from '../lib/cn'
import GlobalSearch from './GlobalSearch'
import AvatarMenu from './AvatarMenu'

export default function Navbar() {
  const counts = useCompletedCounts()

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-3 md:px-8">


        {/* Category tabs — hidden on mobile (bottom nav takes over) */}
        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {CATEGORIES.map((c) => (
            <NavLink
              key={c.key}
              to={c.route}
              title={counts[c.key] ? `${counts[c.key]} ${c.verbs.done.toLowerCase()}` : undefined}
              style={({ isActive }) =>
                isActive
                  ? { color: c.accent, backgroundColor: c.accentSoft }
                  : undefined
              }
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive ? '' : 'text-[var(--color-muted)] hover:text-[var(--color-text)]',
                )
              }
            >
              {c.label}
              {counts[c.key] > 0 && (
                <span
                  className="rounded-full px-1.5 py-px text-[10px] font-bold leading-4"
                  style={{ backgroundColor: c.accentSoft, color: c.accent }}
                >
                  {counts[c.key]}
                </span>
              )}
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
