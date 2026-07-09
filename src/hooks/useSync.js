import { useEffect, useState } from 'react'
import { getSyncStatus, SYNC_STATUS_EVENT } from '../lib/sync'

// Live view of the device-sync engine's status (state, code, last sync time).
export function useSyncStatus() {
  const [status, setStatus] = useState(getSyncStatus)

  useEffect(() => {
    const onStatus = (e) => setStatus(e.detail)
    window.addEventListener(SYNC_STATUS_EVENT, onStatus)
    return () => window.removeEventListener(SYNC_STATUS_EVENT, onStatus)
  }, [])

  return status
}
