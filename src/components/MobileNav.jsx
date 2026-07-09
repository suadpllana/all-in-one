import { NavLink } from 'react-router-dom'
import { CATEGORIES } from '../config/categories'
import { cn } from '../lib/cn'

// Bottom tab bar shown below the md breakpoint in place of the top nav tabs.
export default function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1">
        {CATEGORIES.map((c) => (
          <li key={c.key} className="flex-1">
            <NavLink
              to={c.route}
              style={({ isActive }) =>
                isActive ? { color: c.accent, backgroundColor: c.accentSoft } : undefined
              }
              className={({ isActive }) =>
                cn(
                  'mx-0.5 my-1 flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium',
                  isActive ? '' : 'text-[var(--color-muted)]',
                )
              }
            >
              <span className="text-lg leading-none">{c.icon}</span>
              <span className="truncate">{c.label.split(' ')[0]}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
