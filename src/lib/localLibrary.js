// localStorage-backed library store — the single source of truth for the app.
// The optional device-sync layer (lib/sync.js) mirrors it across devices, so
// deletions are recorded as tombstones instead of vanishing: a device that
// merges later needs to know the item was removed, not just missing.
//
// Row shape:
//   { id, category, external_id, title, poster_url, metadata, status,
//     user_rating, progress, favorite, review,
//     added_at, updated_at, started_at, completed_at }
// Sync merges whole rows (newest updated_at wins), so new optional fields
// travel between devices without any schema change.

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

// Merge fresh metadata over the cached copy without letting a sparse payload
// (a list item) blank out richer fields saved earlier from a detail page.
function mergeMetadata(prev, next) {
  if (!next) return prev ?? null
  if (!prev) return next
  const out = { ...prev }
  for (const [k, v] of Object.entries(next)) {
    const empty = v == null || (Array.isArray(v) && v.length === 0) || v === ''
    if (!empty) out[k] = v
  }
  return out
}

export const localLibrary = {
  list() {
    return read()
  },

  // Create or patch a row. Every field except category/externalId is
  // optional; `undefined` leaves a field untouched, `null` clears it.
  upsert({
    category,
    externalId,
    title,
    posterUrl,
    metadata,
    status,
    userRating,
    progress,
    favorite,
    review,
    completedAt,
  }) {
    const items = read()
    const tombstones = readTombstones()
    const id = rowId(category, externalId)
    const now = new Date().toISOString()
    const existing = items.find((i) => i.id === id)

    if (existing) {
      const prevStatus = existing.status
      if (status) existing.status = status
      if (userRating !== undefined) existing.user_rating = userRating
      if (progress !== undefined) existing.progress = progress
      if (favorite !== undefined) existing.favorite = favorite
      if (review !== undefined) existing.review = review
      existing.title = title ?? existing.title
      existing.poster_url = posterUrl ?? existing.poster_url
      existing.metadata = mergeMetadata(existing.metadata, metadata)
      existing.updated_at = now
      // Entering a status stamps when it happened (drives diaries and
      // "started reading" dates). Re-completing moves the diary entry.
      if (status === 'completed' && prevStatus !== 'completed') existing.completed_at = now
      if (status === 'in_progress' && !existing.started_at) existing.started_at = now
      if (completedAt !== undefined) existing.completed_at = completedAt
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
        progress: progress ?? null,
        favorite: favorite ?? false,
        review: review ?? null,
        added_at: now,
        updated_at: now,
        started_at: status === 'in_progress' ? now : null,
        completed_at: status === 'completed' ? (completedAt ?? now) : null,
      })
    }
    delete tombstones[id]
    write(items, tombstones)
    return read()
  },

  // Put a full row back exactly as it was (undo). updated_at is bumped so the
  // restored state is the newest edit everywhere after sync.
  put(row) {
    const items = read().filter((i) => i.id !== row.id)
    const tombstones = readTombstones()
    items.push({ ...row, updated_at: new Date().toISOString() })
    delete tombstones[row.id]
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
