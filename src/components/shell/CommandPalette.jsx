import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { ALL_CATEGORY_KEYS, getApi } from '../../api'
import { CATEGORIES, CATEGORY_BY_KEY } from '../../config/categories'
import { useDebounce } from '../../hooks/useDebounce'
import { useLibrary } from '../../hooks/useLibrary'
import { usePref } from '../../hooks/usePref'
import { cn } from '../../lib/cn'
import { detailPath } from '../../lib/paths'
import { rowToItem } from '../../lib/rowToItem'
import Icon from '../ui/Icon'

const NO_RECENTS = []

// Spotlight-style search: jump anywhere, search your library instantly and
// all seven sources live. ↑/↓ to move, Enter to open, Esc to close.
export default function CommandPalette({ onClose }) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [recents, setRecents] = usePref('recentSearches', NO_RECENTS)
  const debounced = useDebounce(q.trim(), 250)
  const { items } = useLibrary()

  useEffect(() => {
    inputRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const results = useQueries({
    queries: ALL_CATEGORY_KEYS.map((key) => ({
      queryKey: ['search', key, debounced],
      queryFn: ({ signal }) => getApi(key).search(debounced, signal),
      enabled: debounced.length > 1,
      staleTime: 10 * 60 * 1000,
      retry: 0,
    })),
  })

  // Flat list of selectable entries, grouped for display.
  const groups = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (term.length < 2) {
      const jump = [
        { id: 'home', label: 'Home', sub: 'Your dashboard', icon: 'home', to: '/' },
        ...CATEGORIES.map((c) => ({ id: c.key, label: c.label, sub: c.tagline, icon: c.icon, to: c.route, accent: c.key })),
        { id: 'stats', label: 'My stats', sub: 'Hours, streaks and favourites', icon: 'chart', to: '/stats' },
        { id: 'settings', label: 'Settings', sub: 'Sync, backup and data sources', icon: 'settings', to: '/account' },
      ]
      const out = []
      if (recents.length) {
        out.push({
          title: 'Recent searches',
          entries: recents.slice(0, 4).map((r) => ({ id: `r:${r}`, label: r, icon: 'clock', search: r })),
        })
      }
      out.push({ title: 'Jump to', entries: jump })
      return out
    }

    const out = []
    const mine = items
      .filter((r) => (r.title || '').toLowerCase().includes(term))
      .slice(0, 5)
      .map((r) => {
        const it = rowToItem(r)
        return { id: `lib:${r.id}`, label: it.title, sub: `${CATEGORY_BY_KEY[it.category]?.label} · in your library`, item: it, to: detailPath(it), accent: it.category }
      })
    if (mine.length) out.push({ title: 'In your library', entries: mine })

    ALL_CATEGORY_KEYS.forEach((key, i) => {
      const r = results[i]
      const c = CATEGORY_BY_KEY[key]
      const loading = debounced === q.trim() ? r.isLoading && r.fetchStatus !== 'idle' : true
      const data = debounced === q.trim() ? (r.data || []).slice(0, 3) : []
      if (!loading && data.length === 0) return
      out.push({
        title: c.label,
        icon: c.icon,
        accent: key,
        loading: loading && data.length === 0,
        entries: data.map((it) => ({
          id: `${key}:${it.externalId}`,
          label: it.title,
          sub: [it.year, it.authors?.[0], it.channelTitle].filter(Boolean).join(' · '),
          item: it,
          to: detailPath(it),
          accent: key,
        })),
      })
    })
    out.push({
      title: null,
      entries: [{ id: 'all', label: `See all results for “${q.trim()}”`, icon: 'search', to: `/search?q=${encodeURIComponent(q.trim())}` }],
    })
    return out
  }, [q, debounced, items, results, recents])

  // Row numbers for keyboard navigation, in display order.
  const flat = groups.flatMap((g) => g.entries)
  const indexOf = new Map(flat.map((e, i) => [e.id, i]))

  const activeIndex = Math.min(active, Math.max(0, flat.length - 1))

  function choose(entry) {
    if (!entry) return
    if (entry.search) {
      setQ(entry.search)
      setActive(0)
      return
    }
    const term = q.trim()
    if (term.length > 1) setRecents((r) => [term, ...r.filter((x) => x !== term)].slice(0, 8))
    navigate(entry.to)
    onClose()
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(flat.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(flat[activeIndex])
    }
  }

  // Keep the active row in view.
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Search" className="fixed inset-0 z-[250] flex justify-center px-3 pt-[8vh] sm:pt-[12vh]">
      <div className="fade-in absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="rise relative flex max-h-[76vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_40px_120px_-20px_rgba(0,0,0,.8)] ring-1 ring-line">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Icon name="search" className="h-5 w-5 shrink-0 text-accent" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
            placeholder="Search films, shows, anime, books, games…"
            aria-label="Search everything"
            aria-activedescendant={flat[activeIndex] ? `cp-${flat[activeIndex].id}` : undefined}
            className="h-16 min-w-0 flex-1 bg-transparent text-lg text-fg outline-none placeholder:text-muted"
          />
          <kbd className="hidden rounded-md bg-surface-2 px-2 py-1 text-[11px] font-semibold text-muted ring-1 ring-line sm:block">esc</kbd>
        </div>

        <div ref={listRef} role="listbox" className="thin-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
          {groups.map((g, gi) => (
            <div key={`${g.title}-${gi}`} data-accent={g.accent} className="mb-1">
              {g.title && (
                <p className="flex items-center gap-2 px-3 pb-1.5 pt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                  {g.icon && <Icon name={g.icon} className="h-3.5 w-3.5 text-accent" />}
                  {g.title}
                  {g.loading && <span className="ml-1 h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent" />}
                </p>
              )}
              {g.entries.map((entry) => {
                const i = indexOf.get(entry.id)
                const isActive = i === activeIndex
                return (
                  <button
                    key={entry.id}
                    id={`cp-${entry.id}`}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    data-active={isActive}
                    data-accent={entry.accent}
                    onMouseMove={() => setActive(i)}
                    onClick={() => choose(entry)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors',
                      isActive ? 'bg-surface-2' : 'hover:bg-surface-2/60',
                    )}
                  >
                    <Thumb entry={entry} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-fg">{entry.label}</span>
                      {entry.sub && <span className="block truncate text-xs text-muted">{entry.sub}</span>}
                    </span>
                    {isActive && <Icon name="arrowRight" className="h-4 w-4 shrink-0 text-accent" />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div className="hidden items-center gap-4 border-t border-line px-4 py-2.5 text-[11px] text-muted sm:flex">
          <span><Kbd>↑</Kbd> <Kbd>↓</Kbd> navigate</span>
          <span><Kbd>↵</Kbd> open</span>
          <span className="ml-auto">Searches TMDB, AniList, Open Library, RAWG &amp; YouTube</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Kbd({ children }) {
  return <kbd className="rounded bg-surface-2 px-1.5 py-0.5 font-semibold ring-1 ring-line">{children}</kbd>
}

function Thumb({ entry }) {
  const it = entry.item
  if (!it) {
    return (
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
        <Icon name={entry.icon || 'search'} className="h-5 w-5" />
      </span>
    )
  }
  const shape = CATEGORY_BY_KEY[it.category]?.shape
  const wide = shape === 'wide' || shape === 'video'
  const src = wide ? it.backdropUrl || it.posterUrl : it.posterUrl
  return (
    <span className={cn('shrink-0 overflow-hidden rounded-md bg-surface-2 ring-1 ring-line', wide ? 'h-10 w-[70px]' : 'h-12 w-8')}>
      {src && <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />}
    </span>
  )
}
