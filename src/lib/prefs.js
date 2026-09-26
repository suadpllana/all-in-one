// Small per-device preferences (reading goal, view modes, recent searches).
// Deliberately separate from the library: these are conveniences, not data,
// so they don't ride along with device sync.

const KEY = 'vault:prefs'
const listeners = new Set()

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}

let cache = read()

export function getPref(key, fallback) {
  return cache[key] ?? fallback
}

export function setPref(key, value) {
  cache = { ...cache, [key]: value }
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {
    /* storage full / disabled — keep the in-memory value */
  }
  for (const fn of listeners) fn()
}

export function subscribePrefs(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
