import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getStatusOptions } from '../../config/categories'
import { useItemActions } from '../../hooks/useItemActions'
import { cn } from '../../lib/cn'
import { statusIcon } from '../../lib/status'
import { IconButton } from '../ui/Button'
import Icon from '../ui/Icon'

const MENU_W = 224

// "⋯" menu for list rows whose main buttons only step progress: move the item
// to another list or remove it (every change toasts with Undo). The menu is
// portalled to <body> so clipped cards (e.g. chamfered game cards) can't cut
// it off.
export default function StatusMenu({ item, className }) {
  const a = useItemActions(item)
  const [pos, setPos] = useState(null)
  const button = useRef(null)
  const menu = useRef(null)
  const open = pos != null

  const toggle = () => {
    if (open) return setPos(null)
    const r = button.current.getBoundingClientRect()
    const below = window.innerHeight - r.bottom > 220
    setPos({
      left: Math.max(8, Math.min(r.right - MENU_W, window.innerWidth - MENU_W - 8)),
      ...(below ? { top: r.bottom + 8 } : { bottom: window.innerHeight - r.top + 8 }),
    })
  }

  useEffect(() => {
    if (!open) return
    const close = () => setPos(null)
    const onPointer = (e) => {
      if (!menu.current?.contains(e.target) && !button.current?.contains(e.target)) close()
    }
    const onKey = (e) => e.key === 'Escape' && close()
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  const choose = (fn) => () => {
    setPos(null)
    fn()
  }
  const options = getStatusOptions(a.category).filter((o) => o.status !== a.status)

  return (
    <div className={className}>
      <IconButton
        ref={button}
        icon="more"
        label="Change status"
        size="sm"
        variant="surface"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
      />
      {open &&
        createPortal(
          <div
            ref={menu}
            role="menu"
            style={{ ...pos, width: MENU_W }}
            className="fixed z-[70] rounded-xl bg-bg-elev p-1.5 text-left shadow-2xl ring-1 ring-line"
          >
            {options.map((o) => (
              <MenuItem key={o.status} icon={statusIcon(item.category, o.status)} onClick={choose(() => a.setStatus(o.status))}>
                {o.action}
              </MenuItem>
            ))}
            <div className="mx-2 my-1 h-px bg-line" />
            <MenuItem icon="trash" danger onClick={choose(a.remove)}>
              Remove from library
            </MenuItem>
          </div>,
          document.body,
        )}
    </div>
  )
}

function MenuItem({ icon, danger, children, onClick }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
        danger ? 'text-red-500 hover:bg-red-500/10' : 'text-fg hover:bg-surface-2',
      )}
    >
      <Icon name={icon} className="h-4 w-4 shrink-0" strokeWidth={2.2} />
      {children}
    </button>
  )
}
