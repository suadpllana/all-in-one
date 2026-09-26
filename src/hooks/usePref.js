import { useCallback, useSyncExternalStore } from 'react'
import { getPref, setPref, subscribePrefs } from '../lib/prefs'

// [value, setValue] for a persisted preference. Fallbacks should be
// primitives or module-level constants (the snapshot must be stable).
export function usePref(key, fallback) {
  const value = useSyncExternalStore(subscribePrefs, () => getPref(key, fallback))
  const set = useCallback(
    (v) => setPref(key, typeof v === 'function' ? v(getPref(key, fallback)) : v),
    [key, fallback],
  )
  return [value, set]
}
