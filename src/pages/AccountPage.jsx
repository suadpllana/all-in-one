import { useRef, useState } from 'react'
import { useLibrary } from '../hooks/useLibrary'
import { useSyncStatus } from '../hooks/useSync'
import { localLibrary } from '../lib/localLibrary'
import { createSync, joinSync, disconnectSync, syncNow, getSyncCode } from '../lib/sync'
import { useQueryClient } from '@tanstack/react-query'
import { CATEGORIES } from '../config/categories'
import { downloadBackup, parseBackupFile, restoreBackup } from '../lib/backup'

// Device sync controls: create a code on one device, enter it on another,
// and the libraries stay merged from then on.
function SyncSection() {
  const status = useSyncStatus()
  const qc = useQueryClient()
  const [codeInput, setCodeInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  const code = status.code || getSyncCode()

  async function run(action) {
    setBusy(true)
    setError(null)
    try {
      await action()
      qc.invalidateQueries({ queryKey: ['library'] })
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  function copyCode() {
    navigator.clipboard?.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      {code ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-lg bg-[var(--color-surface-2)] px-3 py-1.5 font-mono text-lg font-bold tracking-widest">
              {code}
            </span>
            <button
              onClick={copyCode}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold hover:bg-[var(--color-surface-2)]"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <span
              className={`text-xs font-semibold ${
                status.state === 'error' ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {status.state === 'syncing' && '● Syncing…'}
              {status.state === 'on' &&
                `● Synced${status.lastSyncAt ? ` · ${new Date(status.lastSyncAt).toLocaleTimeString()}` : ''}`}
              {status.state === 'error' && `● ${status.error}`}
            </span>
          </div>
          <p className="text-sm text-[var(--color-muted)]">
            Enter this code on another device to link it. Changes on any linked device sync to
            all of them, in both directions.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => run(syncNow)}
              disabled={busy}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold hover:bg-[var(--color-surface-2)] disabled:opacity-50"
            >
              Sync now
            </button>
            <button
              onClick={() => {
                if (confirm('Stop syncing on this device? Your local library is kept.')) {
                  disconnectSync()
                }
              }}
              className="rounded-lg border border-red-500/40 px-3 py-1.5 text-sm font-semibold text-red-400 hover:bg-red-500/10"
            >
              Disconnect
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-[var(--color-muted)]">
            Keep your library identical across your phone, PC and any other device — no account
            needed. Create a code here, then enter it on your other devices.
          </p>
          <button
            onClick={() => run(createSync)}
            disabled={busy}
            className="rounded-lg bg-[var(--color-accent,#10b981)] px-3 py-1.5 text-sm font-bold text-black hover:opacity-90 disabled:opacity-50"
          >
            Create sync code
          </button>
          <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
            <span className="h-px flex-1 bg-[var(--color-border)]" />
            or link to an existing code
            <span className="h-px flex-1 bg-[var(--color-border)]" />
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              run(() => joinSync(codeInput))
            }}
          >
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toLowerCase())}
              placeholder="e.g. k3vp-8m2q-x7nd"
              className="w-48 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 font-mono text-sm tracking-widest outline-none focus:border-[var(--color-accent,#10b981)]"
            />
            <button
              type="submit"
              disabled={busy || !codeInput.trim()}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold hover:bg-[var(--color-surface-2)] disabled:opacity-50"
            >
              Link device
            </button>
          </form>
        </>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}

// Export the whole library to a JSON file, and restore from one. The export is
// a full snapshot (see lib/backup), so it doubles as the recovery path if the
// browser's storage is ever cleared.
function BackupSection() {
  const qc = useQueryClient()
  const { items } = useLibrary()
  const fileRef = useRef(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [replaceMode, setReplaceMode] = useState(false)

  // Derived from the live library query so the counts track imports and
  // status changes without a reload.
  const rows = CATEGORIES.map((c) => {
    const total = items.filter((i) => i.category === c.key).length
    return { key: c.key, label: c.label, total }
  }).filter((r) => r.total > 0)
  const total = items.length

  function onExport() {
    setError(null)
    try {
      const backup = downloadBackup()
      setResult(`Exported ${backup.counts.total} item${backup.counts.total === 1 ? '' : 's'}.`)
    } catch (err) {
      setError(err.message || 'Export failed.')
    }
  }

  async function onImport(e) {
    const file = e.target.files?.[0]
    // Reset immediately so picking the same file twice still fires onChange.
    e.target.value = ''
    if (!file) return
    setError(null)
    setResult(null)
    try {
      const data = await parseBackupFile(file)
      if (
        replaceMode &&
        !confirm(
          'Replace your entire library with this backup? Anything not in the file will be removed.',
        )
      )
        return
      const r = restoreBackup(data, { mode: replaceMode ? 'replace' : 'merge' })
      qc.invalidateQueries({ queryKey: ['library'] })
      setResult(
        replaceMode
          ? `Restored ${r.total} item${r.total === 1 ? '' : 's'}.`
          : `Imported — ${r.added} added, ${r.updated} updated.` +
              (r.skipped ? ` ${r.skipped} skipped.` : ''),
      )
    } catch (err) {
      setError(err.message || 'Import failed.')
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <p className="text-sm text-[var(--color-muted)]">
        Download everything you’ve saved — watched, watchlist, ratings and progress across all
        categories — as one JSON file. Keep it somewhere safe and you can restore your library
        even if this browser’s data is cleared.
      </p>

      {rows.length > 0 && (
        <ul className="grid gap-x-4 gap-y-1 text-xs text-[var(--color-muted)] sm:grid-cols-2">
          {rows.map((r) => (
            <li key={r.key} className="flex justify-between gap-2">
              <span>{r.label}</span>
              <span className="font-semibold text-[var(--color-text)]">{r.total}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onExport}
          disabled={total === 0}
          className="rounded-lg bg-[var(--color-accent,#10b981)] px-3 py-1.5 text-sm font-bold text-black hover:opacity-90 disabled:opacity-50"
        >
          Export all ({total})
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold hover:bg-[var(--color-surface-2)]"
        >
          Import backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={onImport}
          className="hidden"
        />
      </div>

      <label className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
        <input
          type="checkbox"
          checked={replaceMode}
          onChange={(e) => setReplaceMode(e.target.checked)}
          className="accent-[var(--color-accent,#10b981)]"
        />
        Replace my library instead of merging into it
      </label>

      {result && <p className="text-sm text-emerald-400">{result}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}

// Account settings + integration/config status.
export default function AccountPage() {
  const { items } = useLibrary()
  const qc = useQueryClient()

  const keys = [
    { label: 'TMDB (Movies · TV · Documentaries)', ok: !!import.meta.env.VITE_TMDB_API_KEY },
    { label: 'RAWG (Games)', ok: !!import.meta.env.VITE_RAWG_API_KEY },
    { label: 'YouTube (Podcasts & video essays)', ok: !!import.meta.env.VITE_YOUTUBE_API_KEY },
    {
      label: 'Books (Google Books → Open Library)',
      ok: true,
      note: import.meta.env.VITE_GOOGLE_BOOKS_API_KEY
        ? 'Google key set · Open Library fallback'
        : 'Using Open Library (no key needed)',
    },
    { label: 'Jikan / AniList (Anime)', ok: true, note: 'No key required' },
  ]

  function clearLocal() {
    if (!confirm('Clear your entire library? Linked devices will clear too. This cannot be undone.'))
      return
    localLibrary.clear()
    qc.invalidateQueries({ queryKey: ['library'] })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-black">Settings</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Your library is stored in this browser — use a sync code to keep other devices in sync.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-bold">Device sync</h2>
        <SyncSection />
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">Data sources</h2>
        <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          {keys.map((k) => (
            <li key={k.label} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>{k.label}</span>
              <span
                className={`flex items-center gap-1.5 text-xs font-semibold ${
                  k.ok ? 'text-emerald-400' : k.optional ? 'text-amber-400' : 'text-red-400'
                }`}
              >
                {k.ok ? '● Connected' : k.optional ? '○ Optional' : '● Missing key'}
                {k.note && <span className="text-[var(--color-muted)]">· {k.note}</span>}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-[var(--color-muted)]">
          Add missing keys to your <code className="rounded bg-[var(--color-surface-2)] px-1">.env</code>{' '}
          file (see <code className="rounded bg-[var(--color-surface-2)] px-1">.env.example</code>) and restart the dev server.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">Backup &amp; export</h2>
        <BackupSection />
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">Library</h2>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-sm">
            You’re tracking <span className="font-bold text-accent">{items.length}</span> item
            {items.length === 1 ? '' : 's'} across {CATEGORIES.length} categories.
          </p>
          <button
            onClick={clearLocal}
            className="mt-3 rounded-lg border border-red-500/40 px-3 py-1.5 text-sm font-semibold text-red-400 hover:bg-red-500/10"
          >
            Clear library
          </button>
        </div>
      </section>
    </div>
  )
}
