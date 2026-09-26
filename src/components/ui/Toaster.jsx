import { useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { dismissToast, getToasts, subscribeToasts } from '../../lib/toast'
import Icon from './Icon'

// Stack of transient confirmations ("Added to Watchlist · Undo"). Sits above
// the mobile tab bar; announced politely to screen readers.
export default function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts)
  return createPortal(
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[300] flex flex-col items-center gap-2 px-4 md:bottom-8"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{ animation: 'toast-in .3s cubic-bezier(.2,.7,.2,1) both' }}
          className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-surface/95 py-2.5 pl-3 pr-2 text-sm text-fg shadow-[0_20px_50px_-12px_rgba(0,0,0,.6)] ring-1 ring-line backdrop-blur-xl"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
            <Icon name={t.icon || 'check'} className="h-4 w-4" strokeWidth={2.4} />
          </span>
          <span className="min-w-0 flex-1 font-medium">{t.message}</span>
          {t.action && (
            <button
              type="button"
              onClick={() => {
                t.action.onClick()
                dismissToast(t.id)
              }}
              className="rounded-lg px-2.5 py-1 text-[13px] font-bold text-accent hover:bg-accent-soft"
            >
              {t.action.label}
            </button>
          )}
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => dismissToast(t.id)}
            className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
          >
            <Icon name="x" className="h-3.5 w-3.5" strokeWidth={2.4} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  )
}
