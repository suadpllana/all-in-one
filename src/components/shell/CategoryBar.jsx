import { useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { getSubmenu } from '../../config/categories'
import { useLibrary } from '../../hooks/useLibrary'
import { useScrolled } from '../../hooks/useScrolled'
import { cn } from '../../lib/cn'
import Icon from '../ui/Icon'

// A world's own navigation: its name in its display face, Discover + the
// library tabs in its vocabulary (Watchlist / Diary, Want to Read / Reading
// / Read, Backlog / Playing / Played…) with live counts, and a search field
// scoped to the world. Sticky under the global bar; transparent over heroes.
export default function CategoryBar({ category, tabKey, query, onQuery, overlay = false }) {
  const scrolled = useScrolled(12)
  const { items } = useLibrary()
  const tabs = getSubmenu(category)
  const [searchOpen, setSearchOpen] = useState(Boolean(query))
  const inputRef = useRef(null)
  const solid = scrolled || !overlay

  const count = (status) => items.filter((i) => i.category === category.key && i.status === status).length
  const tab = tabs.find((t) => t.key === tabKey)
  const placeholder = tabKey === 'discover' ? `Search ${category.label.toLowerCase()}…` : `Filter ${tab?.label.toLowerCase()}…`

  return (
    <div
      className={cn(
        'sticky top-14 z-40 border-b transition-[background-color,border-color] duration-300 md:top-16',
        solid ? 'glass border-line/60' : 'border-transparent',
      )}
    >
      <div className="shell relative flex h-12 items-center gap-3 md:h-[52px] md:gap-5">
        <Link to={category.route} className="hidden shrink-0 items-center gap-2.5 md:flex" aria-label={`${category.label} — discover`}>
          <span className="grid h-8 w-8 place-items-center rounded-ui bg-accent-soft text-accent">
            <Icon name={category.icon} className="h-[18px] w-[18px]" />
          </span>
          <span className="font-display text-[1.35rem] leading-none text-fg">{category.label}</span>
        </Link>
        <span className="hidden h-6 w-px bg-line md:block" />

        <nav aria-label={`${category.label} sections`} className="no-scrollbar -mx-1 flex min-w-0 flex-1 items-stretch gap-0.5 self-stretch overflow-x-auto px-1">
          {tabs.map((t) => {
            const n = t.status ? count(t.status) : 0
            return (
              <NavLink
                key={t.key}
                end
                to={t.key === 'discover' ? category.route : `${category.route}/${t.key}`}
                className={({ isActive }) =>
                  cn(
                    'relative flex shrink-0 items-center gap-2 whitespace-nowrap px-3 text-sm font-semibold transition-colors',
                    isActive ? 'text-fg' : 'text-muted hover:text-fg',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {t.label}
                    {n > 0 && (
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-px text-[11px] font-bold tabular-nums',
                          isActive ? 'bg-accent text-on-accent' : 'bg-surface-2 text-muted',
                        )}
                      >
                        {n}
                      </span>
                    )}
                    <span
                      className={cn(
                        'absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-accent-grad transition-transform duration-300',
                        isActive ? 'scale-x-100' : 'scale-x-0',
                      )}
                    />
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Search: always-visible field on desktop, expanding on phones. */}
        <div
          className={cn(
            'items-center md:relative md:flex md:w-60 xl:w-72',
            searchOpen ? 'absolute inset-x-4 inset-y-1.5 z-10 flex md:inset-auto' : 'hidden',
          )}
        >
          <Icon name="search" className="pointer-events-none absolute left-3 h-4 w-4 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                onQuery('')
                setSearchOpen(false)
                e.currentTarget.blur()
              }
            }}
            placeholder={placeholder}
            aria-label={placeholder}
            className="h-9 w-full rounded-ui bg-surface-2/80 pl-9 pr-9 text-sm text-fg outline-none ring-1 ring-line transition-shadow placeholder:text-muted focus:ring-2 focus:ring-accent"
          />
          {(query || searchOpen) && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                onQuery('')
                setSearchOpen(false)
              }}
              className={cn(
                'absolute right-1.5 grid h-6 w-6 place-items-center rounded-full text-muted hover:bg-surface hover:text-fg',
                !query && 'md:hidden',
              )}
            >
              <Icon name="x" className="h-3.5 w-3.5" strokeWidth={2.4} />
            </button>
          )}
        </div>
        {!searchOpen && (
          <button
            type="button"
            aria-label={placeholder}
            onClick={() => {
              setSearchOpen(true)
              setTimeout(() => inputRef.current?.focus(), 0)
            }}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-fg-2 hover:bg-surface-2 md:hidden"
          >
            <Icon name="search" className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>
    </div>
  )
}
