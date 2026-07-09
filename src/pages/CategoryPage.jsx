import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CATEGORY_BY_KEY, getSubmenu, applyCategoryTheme } from '../config/categories'
import { useSection, useRecommended } from '../hooks/useDiscover'
import { useDebounce } from '../hooks/useDebounce'
import { useOpenDetail } from '../hooks/useOpenDetail'
import Submenu from '../components/Submenu'
import Hero from '../components/Hero'
import Section from '../components/Section'
import CategorySearch from '../components/CategorySearch'
import LibraryView from './LibraryView'

// The single reusable template rendered by all six category routes.
export default function CategoryPage({ categoryKey }) {
  const category = CATEGORY_BY_KEY[categoryKey]
  const { segment } = useParams()
  const view = segment
  const openDetail = useOpenDetail()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)

  // Reset the in-page search when switching categories (render-time pattern,
  // avoids a syncing effect).
  const [lastCat, setLastCat] = useState(categoryKey)
  if (categoryKey !== lastCat) {
    setLastCat(categoryKey)
    setSearch('')
  }

  // Apply this category's full visual identity app-wide (accent gradient,
  // ambient background + typography via <html data-category>).
  useEffect(() => {
    applyCategoryTheme(category)
    document.title = `Vault · ${category.label}`
    return () => delete document.documentElement.dataset.category
  }, [category])

  const tab = getSubmenu(category).find((t) => t.key === (view || 'discover'))
  const isDiscover = !tab || tab.key === 'discover'
  const searching = debouncedSearch.trim().length > 1

  return (
    <div key={categoryKey} className="page-in space-y-6">
      {/* Page masthead — icon emblem, gradient display title, tagline. */}
      <header className="flex items-center gap-4">
        <span
          aria-hidden
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl md:h-16 md:w-16 md:text-4xl"
          style={{
            background: `linear-gradient(135deg, ${category.accentSoft}, transparent 70%)`,
            border: `1px solid color-mix(in srgb, ${category.accent} 35%, transparent)`,
            boxShadow: `0 10px 34px -12px ${category.accent}`,
          }}
        >
          {category.icon}
        </span>
        <div className="min-w-0">
          <h1 className="cat-title text-gradient-accent text-4xl md:text-5xl">
            {category.label}
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--color-muted)]">
            {category.tagline}
            <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
              {category.source}
            </span>
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Submenu category={category} />
        <CategorySearchBox
          category={category}
          value={search}
          onChange={setSearch}
          onClear={() => setSearch('')}
        />
      </div>

      {searching ? (
        <CategorySearch category={category} query={debouncedSearch} onOpen={openDetail} />
      ) : isDiscover ? (
        <Discover category={category} onOpen={openDetail} />
      ) : (
        <LibraryView
          category={category}
          status={tab.status}
          statusLabel={tab.label}
          onOpen={openDetail}
        />
      )}
    </div>
  )
}

function CategorySearchBox({ category, value, onChange, onClear }) {
  return (
    <div className="relative shrink-0 sm:w-64">
      <svg
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Search ${category.label}…`}
        aria-label={`Search ${category.label}`}
        className="w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-1.5 pl-8 pr-8 text-sm outline-none transition-colors placeholder:text-[var(--color-muted)] focus:border-accent"
      />
      {value && (
        <button
          onClick={onClear}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
        >
          ✕
        </button>
      )}
    </div>
  )
}

function Discover({ category, onOpen }) {
  const key = category.key
  const newReleases = useSection(key, 'newReleases')
  const trending = useSection(key, 'trending')
  const topRated = useSection(key, 'topRated')
  const recommended = useRecommended(key)

  return (
    <div className="space-y-8">
      <Hero query={newReleases} onOpen={onOpen} />

      <Section
        title="Recommended for you"
        subtitle="Based on your library"
        query={recommended}
        onOpen={onOpen}
        hideWhenEmpty
      />
      <Section title="Trending Now" query={trending} onOpen={onOpen} />
      <Section title="Top Rated" query={topRated} onOpen={onOpen} />
      <Section title="New Releases" query={newReleases} onOpen={onOpen} />
    </div>
  )
}
