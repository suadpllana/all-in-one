import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getStatusOptions, CATEGORY_BY_KEY } from '../config/categories'
import { useLibrary } from '../hooks/useLibrary'
import { cn } from '../lib/cn'

// Quick-add control on every card + detail view. Shows current status and a
// menu of status options; re-selecting the active status removes the item.
//
// The menu is rendered through a portal with fixed positioning so it can't be
// clipped by the card's `overflow-hidden` (which was hiding it entirely).
export default function StatusDropdown({ item, variant = 'card' }) {
  const { getStatus, setStatus, remove } = useLibrary()
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState(null)
  const wrapRef = useRef()
  const btnRef = useRef()
  const menuRef = useRef()

  const category = CATEGORY_BY_KEY[item.category]
  const options = getStatusOptions(category)
  const current = getStatus(item.category, item.externalId)
  const currentLabel = options.find((o) => o.status === current)?.label
  const isDetail = variant === 'detail'

  // Position the portalled menu next to the trigger button.
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return
    const MENU_W = 192 // w-48
    const MENU_H = 8 + options.length * 40
    const r = btnRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - r.bottom
    const openUp = spaceBelow < MENU_H + 8 && r.top > MENU_H
    const left = isDetail
      ? Math.min(r.left, window.innerWidth - MENU_W - 8)
      : Math.min(Math.max(8, r.right - MENU_W), window.innerWidth - MENU_W - 8)
    setCoords({
      left,
      top: openUp ? r.top - MENU_H - 4 : r.bottom + 4,
    })
  }, [open, isDetail, options.length])

  // Close on outside click, scroll, resize or Escape.
  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (
        wrapRef.current?.contains(e.target) ||
        menuRef.current?.contains(e.target)
      )
        return
      setOpen(false)
    }
    function onClose() {
      setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onClose, true)
    window.addEventListener('resize', onClose)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onClose, true)
      window.removeEventListener('resize', onClose)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function choose(status) {
    if (status === current) remove(item.category, item.externalId)
    else setStatus(item, status)
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        style={current ? { backgroundColor: category.accent } : undefined}
        className={cn(
          'flex items-center justify-center gap-1 rounded-lg font-semibold transition-colors',
          isDetail ? 'px-4 py-2 text-sm' : 'w-full px-2 py-1.5 text-xs',
          current ? 'text-white' : 'bg-white/10 text-white backdrop-blur hover:bg-white/20',
        )}
      >
        {current ? (
          <>
            <CheckIcon /> {isDetail ? currentLabel : short(currentLabel)}
          </>
        ) : (
          <>
            <PlusIcon /> {isDetail ? 'Add to library' : 'Add'}
          </>
        )}
      </button>

      {open &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'fixed', top: coords.top, left: coords.left, width: 192 }}
            className="z-[100] overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-1 text-sm shadow-2xl"
          >
            {options.map((o) => (
              <button
                key={o.status}
                type="button"
                onClick={() => choose(o.status)}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2 text-left hover:bg-[var(--color-surface-2)]',
                  o.status === current && 'text-accent',
                )}
              >
                {o.label}
                {o.status === current && <span className="text-xs">Remove</span>}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  )
}

// Shorten dropdown labels like "Mark as Watching" -> "Watching" for cards.
function short(label = '') {
  return label.replace(/^(Add to|Mark as)\s+/, '')
}

function PlusIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}
