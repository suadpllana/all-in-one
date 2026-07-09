import { NavLink } from 'react-router-dom'
import { getSubmenu } from '../config/categories'
import { useLibrary } from '../hooks/useLibrary'
import { cn } from '../lib/cn'

// Secondary tab bar inside a category page: Discover / plan / progress / done.
// Rendered as pills — the active one fills with the category's accent
// gradient. Non-discover tabs show a live count from the user's library.
export default function Submenu({ category }) {
  const { items } = useLibrary()
  const tabs = getSubmenu(category)

  const countFor = (status) =>
    status ? items.filter((i) => i.category === category.key && i.status === status).length : null

  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
      {tabs.map((t) => {
        const count = countFor(t.status)
        return (
          <NavLink
            key={t.key}
            end
            to={t.key === 'discover' ? category.route : `${category.route}/${t.key}`}
            style={({ isActive }) =>
              isActive
                ? {
                    backgroundImage: `linear-gradient(100deg, ${category.accent}, ${category.accent2})`,
                    boxShadow: `0 6px 22px -8px ${category.accent}`,
                  }
                : undefined
            }
            className={({ isActive }) =>
              cn(
                'flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all',
                isActive
                  ? 'text-white'
                  : 'bg-[var(--color-surface)] text-[var(--color-muted)] ring-1 ring-[var(--color-border)] hover:text-[var(--color-text)] hover:ring-[var(--color-muted)]',
              )
            }
          >
            {({ isActive }) => (
              <>
                {t.label}
                {count != null && count > 0 && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 text-xs font-bold',
                      isActive ? 'bg-white/25 text-white' : 'bg-[var(--color-surface-2)]',
                    )}
                  >
                    {count}
                  </span>
                )}
              </>
            )}
          </NavLink>
        )
      })}
    </div>
  )
}
