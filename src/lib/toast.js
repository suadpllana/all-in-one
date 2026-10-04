// Minimal toast store (no dependency). toast('Added to Watchlist', {
// action: { label: 'Undo', onClick } }) — rendered by <Toaster/>. Pass
// `actions: [...]` for more than one button.

let toasts = []
let nextId = 1
const listeners = new Set()

function emit() {
  for (const fn of listeners) fn()
}

export function toast(message, { action, actions, icon, tone, duration = 4500 } = {}) {
  const t = { id: nextId++, message, actions: (actions || [action]).filter(Boolean), icon, tone }
  // Keep the stack short; newest last.
  toasts = [...toasts.slice(-2), t]
  emit()
  setTimeout(() => dismissToast(t.id), duration)
  return t.id
}

export function dismissToast(id) {
  const next = toasts.filter((t) => t.id !== id)
  if (next.length !== toasts.length) {
    toasts = next
    emit()
  }
}

export function subscribeToasts(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getToasts() {
  return toasts
}
