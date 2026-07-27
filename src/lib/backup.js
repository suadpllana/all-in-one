// Export/import of the whole library as a single JSON file.
//
// The export is a full snapshot (every row, every category, plus the sync
// tombstones) so it can restore the library exactly — not just a human-readable
// dump. Rows are stored in their on-disk shape, which keeps import a plain
// write rather than a lossy re-mapping.

import { localLibrary, LIBRARY_CHANGED_EVENT } from './localLibrary'
import { CATEGORIES, CATEGORY_BY_KEY } from '../config/categories'

export const BACKUP_FORMAT = 'vault.library.backup'
export const BACKUP_VERSION = 1

// Grouped counts for the summary shown next to the export button and stored in
// the file itself, so a backup is legible without importing it.
function summarize(items) {
  const byCategory = {}
  for (const c of CATEGORIES) {
    const rows = items.filter((i) => i.category === c.key)
    if (!rows.length) continue
    const byStatus = {}
    for (const r of rows) byStatus[r.status] = (byStatus[r.status] || 0) + 1
    byCategory[c.key] = { label: c.label, total: rows.length, byStatus }
  }
  return byCategory
}

export function buildBackup() {
  const { items, tombstones } = localLibrary.snapshot()
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    counts: { total: items.length, byCategory: summarize(items) },
    items,
    tombstones,
  }
}

function stamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// Triggers a download of the snapshot. Returns it so the caller can report
// what was written.
export function downloadBackup() {
  const backup = buildBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vault-library-${stamp()}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoked on the next tick so the click has consumed the URL first.
  setTimeout(() => URL.revokeObjectURL(url), 0)
  return backup
}

function isValidRow(r) {
  return (
    r &&
    typeof r === 'object' &&
    typeof r.category === 'string' &&
    CATEGORY_BY_KEY[r.category] &&
    (r.external_id != null || r.externalId != null)
  )
}

// Rows are keyed by "category:external_id"; rebuild the id when an older or
// hand-edited file is missing it.
function normalizeRow(r) {
  const externalId = String(r.external_id ?? r.externalId)
  return {
    ...r,
    external_id: externalId,
    id: r.id || `${r.category}:${externalId}`,
  }
}

/**
 * Restore from a parsed backup object.
 *
 * mode 'merge'   — keep existing rows, add missing ones. On collision the row
 *                  with the newer updated_at wins, so importing an older backup
 *                  can't silently roll back newer progress.
 * mode 'replace' — the backup becomes the library verbatim.
 *
 * Returns { added, updated, skipped, total }.
 */
export function restoreBackup(data, { mode = 'merge' } = {}) {
  if (!data || typeof data !== 'object') throw new Error('That file isn’t valid JSON.')
  if (data.format !== BACKUP_FORMAT) {
    throw new Error('That file isn’t a Vault library backup.')
  }
  if (!Array.isArray(data.items)) throw new Error('This backup has no items in it.')

  const incoming = data.items.filter(isValidRow).map(normalizeRow)
  const skipped = data.items.length - incoming.length

  if (mode === 'replace') {
    localLibrary.applySnapshot({
      items: incoming,
      tombstones: data.tombstones || {},
    })
    window.dispatchEvent(new Event(LIBRARY_CHANGED_EVENT))
    return { added: incoming.length, updated: 0, skipped, total: incoming.length }
  }

  const { items: current, tombstones } = localLibrary.snapshot()
  const byId = new Map(current.map((r) => [r.id, r]))
  let added = 0
  let updated = 0

  for (const row of incoming) {
    const existing = byId.get(row.id)
    if (!existing) {
      byId.set(row.id, row)
      added++
      continue
    }
    // Newer wins. Missing timestamps sort as oldest, so a real timestamp
    // always beats an absent one.
    if ((row.updated_at || '') > (existing.updated_at || '')) {
      byId.set(row.id, row)
      updated++
    }
  }

  const merged = [...byId.values()]
  // An imported row is an explicit resurrection — drop any tombstone that
  // would otherwise delete it again on the next sync.
  const nextTombstones = { ...tombstones }
  for (const row of incoming) delete nextTombstones[row.id]

  localLibrary.applySnapshot({ items: merged, tombstones: nextTombstones })
  // applySnapshot is silent (it's the sync-apply path); notify so the sync
  // layer pushes this restore out to any linked devices.
  window.dispatchEvent(new Event(LIBRARY_CHANGED_EVENT))

  return { added, updated, skipped, total: merged.length }
}

export function parseBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result))
      } catch {
        reject(new Error('That file isn’t valid JSON.'))
      }
    }
    reader.readAsText(file)
  })
}
