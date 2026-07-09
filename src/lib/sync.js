import { localLibrary, LIBRARY_CHANGED_EVENT } from './localLibrary'

// Device sync. localStorage stays the source of truth on every device; the
// tiny Netlify Function at netlify/functions/sync.mjs (backed by Netlify
// Blobs) holds one { rev, data } document per sync code and is used purely
// as a relay. The code is the auth: whoever has it shares that document.
//
// Every operation funnels through reconcile(): fetch the document, merge it
// with the local snapshot (per-item newest-edit-wins, tombstones beat older
// items), push back with the fetched rev. A 409 means another device wrote
// in between — merge its returned document and retry. There is no realtime
// channel, so devices also poll while visible and re-sync on focus.

const ENDPOINT = '/.netlify/functions/sync'
const CODE_KEY = 'vault:sync:code'
const CODE_RE = /^[a-z0-9][a-z0-9-]{7,63}$/
const PUSH_DEBOUNCE_MS = 800
const POLL_MS = 20_000
const MAX_PUT_RETRIES = 3

export const SYNC_STATUS_EVENT = 'vault:sync-status'

let pushTimer = null
let pollTimer = null
let onRemoteChange = null
let status = {
  state: 'off', // 'off' | 'syncing' | 'on' | 'error'
  code: null,
  lastSyncAt: null,
  error: null,
}

function setStatus(patch) {
  status = { ...status, ...patch }
  window.dispatchEvent(new CustomEvent(SYNC_STATUS_EVENT, { detail: status }))
}

export function getSyncStatus() {
  return status
}

export function getSyncCode() {
  const code = localStorage.getItem(CODE_KEY)?.toLowerCase()
  return code && CODE_RE.test(code) ? code : null
}

// Short, readable, unambiguous (no 0/o/1/i/l). Three groups of 4 from a
// 31-char alphabet ≈ 59 bits — plenty for a personal document key.
export function generateSyncCode() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8)}`
}

function normalize(snap) {
  return { items: snap?.items || [], tombstones: snap?.tombstones || {} }
}

// Canonical serialization so "did anything change?" ignores array/key order.
function sig(snap) {
  return JSON.stringify({
    items: [...snap.items].sort((a, b) => a.id.localeCompare(b.id)),
    tombstones: Object.fromEntries(
      Object.entries(snap.tombstones).sort(([a], [b]) => a.localeCompare(b)),
    ),
  })
}

export function mergeSnapshots(a, b) {
  const items = new Map()
  for (const item of [...a.items, ...b.items]) {
    const prev = items.get(item.id)
    if (!prev || (item.updated_at || '') > (prev.updated_at || '')) {
      items.set(item.id, item)
    }
  }

  // Newest tombstone per id from either side.
  const tombstones = { ...a.tombstones }
  for (const [id, deletedAt] of Object.entries(b.tombstones)) {
    if (!tombstones[id] || deletedAt > tombstones[id]) tombstones[id] = deletedAt
  }

  // A tombstone deletes the item unless the item was edited after the
  // deletion (re-added on another device) — then the item wins and the
  // tombstone is dropped.
  for (const [id, deletedAt] of Object.entries(tombstones)) {
    const item = items.get(id)
    if (!item) continue
    if ((item.updated_at || '') > deletedAt) delete tombstones[id]
    else items.delete(id)
  }

  return { items: [...items.values()], tombstones }
}

async function request(method, code, body) {
  let res
  try {
    res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(code)}`, {
      method,
      ...(body !== undefined && {
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    })
  } catch {
    throw new Error('Sync backend unreachable — are you offline?')
  }
  let doc
  try {
    doc = await res.json()
  } catch {
    // Plain `vite dev` has no Netlify Functions; the 404 comes back as HTML.
    throw new Error('Sync backend not found — use `netlify dev` or the deployed site')
  }
  if (!res.ok && res.status !== 409) {
    throw new Error(doc?.error || `Sync failed (${res.status})`)
  }
  return { status: res.status, doc }
}

async function fetchDoc(code) {
  const { doc } = await request('GET', code)
  return doc // { rev, data }
}

let reconciling = null

async function reconcile() {
  const code = getSyncCode()
  if (!code) return
  // Coalesce concurrent triggers (poll + focus + local edit).
  if (reconciling) return reconciling
  reconciling = (async () => {
    setStatus({ state: 'syncing', code })
    try {
      let { rev, data } = await fetchDoc(code)
      let remote = normalize(data)
      const local = normalize(localLibrary.snapshot())
      let merged = mergeSnapshots(local, remote)

      // Push if the document is stale; on 409 another device won the race —
      // fold its document in and try again with the new rev.
      for (let attempt = 0; sig(merged) !== sig(remote); attempt++) {
        if (attempt >= MAX_PUT_RETRIES) throw new Error('Sync conflict — will retry')
        const res = await request('PUT', code, { rev, data: merged })
        if (res.status === 409) {
          rev = res.doc.rev
          remote = normalize(res.doc.data)
          merged = mergeSnapshots(merged, remote)
          continue
        }
        break
      }

      if (sig(merged) !== sig(local)) {
        localLibrary.applySnapshot(merged)
        onRemoteChange?.()
      }
      setStatus({ state: 'on', lastSyncAt: new Date().toISOString(), error: null })
    } catch (err) {
      setStatus({ state: 'error', error: err.message || 'Sync failed' })
    } finally {
      reconciling = null
    }
  })()
  return reconciling
}

function schedulePush() {
  if (!getSyncCode()) return
  clearTimeout(pushTimer)
  pushTimer = setTimeout(reconcile, PUSH_DEBOUNCE_MS)
}

function startPolling() {
  clearInterval(pollTimer)
  pollTimer = setInterval(() => {
    if (document.visibilityState === 'visible') reconcile()
  }, POLL_MS)
}

function stopTimers() {
  clearTimeout(pushTimer)
  clearInterval(pollTimer)
  pushTimer = pollTimer = null
}

// Called once at app startup. onChange is invoked after a remote snapshot is
// applied locally, so the UI (react-query cache) can refresh.
export function startSync({ onChange } = {}) {
  onRemoteChange = onChange
  window.addEventListener(LIBRARY_CHANGED_EVENT, schedulePush)
  window.addEventListener('focus', () => reconcile())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') reconcile()
  })
  if (getSyncCode()) {
    setStatus({ code: getSyncCode() })
    startPolling()
    reconcile()
  }
}

// "Create sync code" on the first device: mints a code, uploads the current
// library, starts live sync, returns the code to show the user.
export async function createSync() {
  const code = generateSyncCode()
  const res = await request('PUT', code, {
    rev: 0,
    data: normalize(localLibrary.snapshot()),
  })
  // A 409 on rev 0 means the code is somehow taken — astronomically unlikely.
  if (res.status === 409) throw new Error('Code collision — try again')
  localStorage.setItem(CODE_KEY, code)
  setStatus({ state: 'on', code, lastSyncAt: new Date().toISOString(), error: null })
  startPolling()
  return code
}

// "Enter sync code" on another device: merges that document's library with
// whatever is already local (union; newest edit wins) and starts live sync.
export async function joinSync(rawCode) {
  const code = rawCode.trim().toLowerCase()
  if (!CODE_RE.test(code)) throw new Error('That doesn’t look like a sync code')
  const doc = await fetchDoc(code)
  if (doc.data === null) {
    throw new Error('Sync code not found — create it on your other device first')
  }
  localStorage.setItem(CODE_KEY, code)
  startPolling()
  await reconcile()
  return code
}

// Stops syncing this device. Local data is kept; other devices keep syncing.
export function disconnectSync() {
  localStorage.removeItem(CODE_KEY)
  stopTimers()
  setStatus({ state: 'off', code: null, error: null })
}

export function syncNow() {
  return reconcile()
}
