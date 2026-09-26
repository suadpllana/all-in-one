import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLibrary } from '../../hooks/useLibrary'
import { useSyncStatus } from '../../hooks/useSync'
import { cn } from '../../lib/cn'
import Icon from '../ui/Icon'

export default function AvatarMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const sync = useSyncStatus()
  const { items } = useLibrary()

  useEffect(() => {
    if (!open) return
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const synced = sync.state === 'on' || sync.state === 'syncing'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className="relative grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-fg-2 ring-1 ring-line transition-colors hover:text-fg hover:ring-accent-line"
      >
        <Icon name="user" className="h-[18px] w-[18px]" />
        {synced && (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-bg" title="Sync on" />
        )}
      </button>

      {open && (
        <div className="rise absolute right-0 top-12 w-64 overflow-hidden rounded-2xl bg-surface/95 shadow-[0_30px_60px_-20px_rgba(0,0,0,.6)] ring-1 ring-line backdrop-blur-xl">
          <div className="border-b border-line px-4 py-3.5">
            <p className="text-sm font-bold text-fg">Your Vault</p>
            <p className="mt-0.5 text-xs text-muted">
              {items.length} {items.length === 1 ? 'title' : 'titles'} ·{' '}
              <span className={synced ? 'text-emerald-400' : ''}>{synced ? 'syncing across devices' : 'this device only'}</span>
            </p>
          </div>
          <nav className="p-1.5 text-sm">
            <MenuLink to="/stats" icon="chart" onClick={() => setOpen(false)}>
              My stats
            </MenuLink>
            <MenuLink to="/account" icon="settings" onClick={() => setOpen(false)}>
              Settings, sync &amp; backup
            </MenuLink>
          </nav>
        </div>
      )}
    </div>
  )
}

function MenuLink({ to, icon, children, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg')}
    >
      <Icon name={icon} className="h-4 w-4" />
      {children}
    </Link>
  )
}
