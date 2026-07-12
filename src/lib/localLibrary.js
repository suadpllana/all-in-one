// localStorage-backed library store — the single source of truth for the app.
// The optional device-sync layer (lib/sync.js) mirrors it across devices, so
// deletions are recorded as tombstones instead of vanishing: a device that
// merges later needs to know the item was removed, not just missing.

const KEY = 'vault:library'
const TOMBSTONE_KEY = 'vault:library:tombstones'

// Fired on every local mutation so the sync layer can schedule a push.
export const LIBRARY_CHANGED_EVENT = 'vault:library-changed'

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || []
  } catch {
    return []
  }
}

function readTombstones() {
  try {
    return JSON.parse(localStorage.getItem(TOMBSTONE_KEY)) || {}
  } catch {
    return {}
  }
}

// silent: used when applying a remote snapshot, so the write doesn't loop
// back into another sync push.
function write(items, tombstones, { silent = false } = {}) {
  localStorage.setItem(KEY, JSON.stringify(items))
  localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(tombstones))
  if (!silent) window.dispatchEvent(new Event(LIBRARY_CHANGED_EVENT))
}

// A stable composite id so the same title in the same category is one row.
function rowId(category, externalId) {
  return `${category}:${externalId}`
}

export const localLibrary = {
  list() {
    return read()
  },

  upsert({ category, externalId, title, posterUrl, metadata, status, userRating }) {
    const items = read()
    const tombstones = readTombstones()
    const id = rowId(category, externalId)
    const now = new Date().toISOString()
    const existing = items.find((i) => i.id === id)

    if (existing) {
      existing.status = status ?? existing.status
      // undefined = untouched; null = explicitly cleared by the user.
      if (userRating !== undefined) existing.user_rating = userRating
      existing.title = title ?? existing.title
      existing.poster_url = posterUrl ?? existing.poster_url
      existing.metadata = metadata ?? existing.metadata
      existing.updated_at = now
      if (status === 'completed' && !existing.completed_at) {
        existing.completed_at = now
      }
    } else {
      items.push({
        id,
        category,
        external_id: String(externalId),
        title,
        poster_url: posterUrl,
        metadata: metadata ?? null,
        status,
        user_rating: userRating ?? null,
        added_at: now,
        updated_at: now,
        completed_at: status === 'completed' ? now : null,
      })
    }
    delete tombstones[id]
    write(items, tombstones)
    return read()
  },

  remove({ category, externalId }) {
    const id = rowId(category, externalId)
    const tombstones = readTombstones()
    tombstones[id] = new Date().toISOString()
    write(
      read().filter((i) => i.id !== id),
      tombstones,
    )
    return read()
  },

  clear() {
    const now = new Date().toISOString()
    const tombstones = readTombstones()
    for (const item of read()) tombstones[item.id] = now
    write([], tombstones)
  },

  // --- sync-layer API ---

  snapshot() {
    return { items: read(), tombstones: readTombstones() }
  },

  applySnapshot({ items, tombstones }) {
    write(items || [], tombstones || {}, { silent: true })
  },
}
