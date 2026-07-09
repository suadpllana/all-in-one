import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

// Global search box. Debounces input and pushes to /search?q= which fans the
// query out across all six categories.
export default function GlobalSearch({ full = false }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const q = params.get('q') || ''
  const [value, setValue] = useState(q)
  const [syncedQ, setSyncedQ] = useState(q)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef()
  const inputRef = useRef()

  // Keep the box in sync when the URL's q changes externally (e.g. a deep link
  // to /search?q=...). Adjusting state during render is the recommended pattern
  // over a syncing effect.
  if (q && q !== syncedQ) {
    setSyncedQ(q)
    setValue(q)
  }

  useEffect(() => {
    return () => clearTimeout(debounceRef.current)
  }, [])

  function onChange(e) {
    const next = e.target.value
    setValue(next)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (next.trim()) navigate(`/search?q=${encodeURIComponent(next.trim())}`)
    }, 400)
  }

  function onSubmit(e) {
    e.preventDefault()
    clearTimeout(debounceRef.current)
    if (value.trim()) navigate(`/search?q=${encodeURIComponent(value.trim())}`)
  }

  return (
    <form onSubmit={onSubmit} className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={onChange}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder="Search everything…"
        aria-label="Search across all categories"
        className={cnInput(open, full)}
      />
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
    </form>
  )
}

function cnInput(open, full) {
  return [
    // full: stretch to the container (mobile bottom bar); otherwise the
    // compact grow-on-focus pill used in the top navbar.
    full ? 'w-full' : 'w-36 focus:w-44 sm:w-48 sm:focus:w-64',
    'rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]',
    'py-1.5 pl-8 pr-3 text-sm text-[var(--color-text)] outline-none transition-all',
    'placeholder:text-[var(--color-muted)]',
    open ? 'border-accent' : '',
  ].join(' ')
}
