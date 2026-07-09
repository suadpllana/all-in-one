import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AvatarMenu() {
  const { user, signOut, mode } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef()
  const navigate = useNavigate()

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const name = user?.user_metadata?.name || user?.email || 'Guest'
  const initial = name.charAt(0).toUpperCase()

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-surface-2)] text-sm font-bold ring-1 ring-[var(--color-border)] hover:ring-accent"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
          <div className="border-b border-[var(--color-border)] px-4 py-3">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-xs text-[var(--color-muted)]">
              {mode === 'local' ? 'Local library (no account)' : user?.email}
            </p>
          </div>
          <nav className="py-1 text-sm">
            <MenuLink to="/stats" onClick={() => setOpen(false)}>
              📊 My Stats
            </MenuLink>
            <MenuLink to="/account" onClick={() => setOpen(false)}>
              ⚙️ Account settings
            </MenuLink>
            {mode === 'supabase' ? (
              user ? (
                <button
                  onClick={async () => {
                    await signOut()
                    setOpen(false)
                    navigate('/movies')
                  }}
                  className="block w-full px-4 py-2 text-left hover:bg-[var(--color-surface-2)]"
                >
                  🚪 Sign out
                </button>
              ) : (
                <MenuLink to="/login" onClick={() => setOpen(false)}>
                  🔑 Sign in
                </MenuLink>
              )
            ) : null}
          </nav>
        </div>
      )}
    </div>
  )
}

function MenuLink({ to, children, onClick }) {
  return (
    <Link to={to} onClick={onClick} className="block px-4 py-2 hover:bg-[var(--color-surface-2)]">
      {children}
    </Link>
  )
}
