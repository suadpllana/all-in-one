import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLibrary } from '../hooks/useLibrary'
import { usePref } from '../hooks/usePref'
import { useSyncStatus } from '../hooks/useSync'
import { useDocumentTitle, useTheme } from '../hooks/useTheme'
import { localLibrary } from '../lib/localLibrary'
import { createSync, joinSync, disconnectSync, syncNow, getSyncCode } from '../lib/sync'
import { CATEGORIES } from '../config/categories'
import { downloadBackup, parseBackupFile, restoreBackup } from '../lib/backup'
import { cn } from '../lib/cn'
import { Button } from '../components/ui/Button'
import Icon from '../components/ui/Icon'

function Card({ icon, title, subtitle, children, tone }) {
  return (
    <section className={cn('rounded-card bg-surface p-5 ring-1 md:p-6', tone === 'danger' ? 'ring-red-500/30' : 'ring-line')}>
      <div className="flex items-start gap-3.5">
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-ui', tone === 'danger' ? 'bg-red-500/10 text-red-400' : 'bg-accent-soft text-accent')}>
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-fg">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm leading-relaxed text-muted">{subtitle}</p>}
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </section>
  )
}

// Device sync: create a code on one device, enter it on another, and the
// libraries stay merged from then on.
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
    <Card
      icon="cloud"
      title="Device sync"
      subtitle="Keep your library identical on your phone, laptop and anything else — no account needed. Changes flow both ways."
    >
      {code ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-ui bg-surface-2 px-4 py-2 font-mono text-lg font-bold tracking-[0.2em] text-fg ring-1 ring-line">{code}</span>
            <Button size="sm" icon={copied ? 'check' : 'copy'} onClick={copyCode}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <span className={cn('flex items-center gap-1.5 text-xs font-semibold', status.state === 'error' ? 'text-red-400' : 'text-emerald-400')}>
              <span className={cn('h-2 w-2 rounded-full', status.state === 'error' ? 'bg-red-400' : 'bg-emerald-400', status.state === 'syncing' && 'animate-pulse')} />
              {status.state === 'syncing' && 'Syncing…'}
              {status.state === 'on' && `Synced${status.lastSyncAt ? ` · ${new Date(status.lastSyncAt).toLocaleTimeString()}` : ''}`}
              {status.state === 'error' && status.error}
            </span>
          </div>
          <p className="text-sm text-muted">Enter this code on another device to link it.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" icon="refresh" onClick={() => run(syncNow)} disabled={busy}>
              Sync now
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                if (confirm('Stop syncing on this device? Your local library is kept.')) disconnectSync()
              }}
            >
              Disconnect
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Button variant="primary" icon="plus" onClick={() => run(createSync)} disabled={busy}>
            Create sync code
          </Button>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" />
            or link to an existing code
            <span className="h-px flex-1 bg-line" />
          </div>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              run(() => joinSync(codeInput))
            }}
          >
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toLowerCase())}
              placeholder="e.g. k3vp-8m2q-x7nd"
              aria-label="Sync code"
              className="h-10 w-56 rounded-ui bg-surface-2 px-3 font-mono text-sm tracking-widest text-fg outline-none ring-1 ring-line focus:ring-2 focus:ring-accent"
            />
            <Button type="submit" disabled={busy || !codeInput.trim()}>
              Link device
            </Button>
          </form>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </Card>
  )
}

// Export the whole library to a JSON file, and restore from one. The export
// is a full snapshot (see lib/backup), so it doubles as the recovery path if
// the browser's storage is ever cleared.
function BackupSection() {
  const qc = useQueryClient()
  const { items } = useLibrary()
  const fileRef = useRef(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [replaceMode, setReplaceMode] = useState(false)
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
      if (replaceMode && !confirm('Replace your entire library with this backup? Anything not in the file will be removed.')) return
      const r = restoreBackup(data, { mode: replaceMode ? 'replace' : 'merge' })
      qc.invalidateQueries({ queryKey: ['library'] })
      setResult(
        replaceMode
          ? `Restored ${r.total} item${r.total === 1 ? '' : 's'}.`
          : `Imported — ${r.added} added, ${r.updated} updated.` + (r.skipped ? ` ${r.skipped} skipped.` : ''),
      )
    } catch (err) {
      setError(err.message || 'Import failed.')
    }
  }

  return (
    <Card
      icon="download"
      title="Backup & export"
      subtitle="Everything you’ve saved — lists, ratings, reviews and progress in every world — as one JSON file you can restore any time."
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" icon="download" onClick={onExport} disabled={total === 0}>
          Export all ({total})
        </Button>
        <Button icon="upload" onClick={() => fileRef.current?.click()}>
          Import backup
        </Button>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={onImport} className="hidden" />
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={replaceMode} onChange={(e) => setReplaceMode(e.target.checked)} className="accent-[var(--accent)]" />
        Replace my library instead of merging into it
      </label>
      {result && <p className="mt-3 text-sm text-emerald-400">{result}</p>}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </Card>
  )
}

function GoalSection() {
  const year = new Date().getFullYear()
  const [goal, setGoal] = usePref(`book.goal.${year}`, 24)
  return (
    <Card icon="target" title={`${year} reading goal`} subtitle="How many books you want to finish this year — tracked in Books.">
      <label className="flex items-center gap-3 text-sm text-fg-2">
        <input
          type="number"
          min={1}
          max={500}
          value={goal}
          onChange={(e) => setGoal(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
          className="h-10 w-24 rounded-ui bg-surface-2 px-3 text-center font-semibold text-fg outline-none ring-1 ring-line focus:ring-2 focus:ring-accent"
        />
        books
      </label>
    </Card>
  )
}

// Settings: sync, backup, goals, data sources, danger zone.
export default function AccountPage() {
  useTheme('home')
  useDocumentTitle('Settings')
  const { items } = useLibrary()
  const qc = useQueryClient()

  const keys = [
    { label: 'TMDB', worlds: 'Movies · TV · Documentaries', ok: !!import.meta.env.VITE_TMDB_API_KEY },
    { label: 'RAWG', worlds: 'Games', ok: !!import.meta.env.VITE_RAWG_API_KEY },
    { label: 'YouTube Data API', worlds: 'YouTube', ok: !!import.meta.env.VITE_YOUTUBE_API_KEY },
    {
      label: 'Open Library / Google Books',
      worlds: 'Books',
      ok: true,
      note: import.meta.env.VITE_GOOGLE_BOOKS_API_KEY ? 'Google key set' : 'No key needed',
    },
    { label: 'AniList / MyAnimeList', worlds: 'Anime', ok: true, note: 'No key needed' },
  ]

  function clearLocal() {
    if (!confirm('Clear your entire library? Linked devices will clear too. This cannot be undone.')) return
    localLibrary.clear()
    qc.invalidateQueries({ queryKey: ['library'] })
  }

  return (
    <div className="shell page-in max-w-3xl space-y-5 pb-10 pt-8 md:pt-12">
      <header className="mb-8">
        <p className="kicker text-accent">Your vault</p>
        <h1 className="mt-2 text-5xl font-extrabold tracking-[-0.045em] text-fg">Settings</h1>
        <p className="mt-2 text-muted">Your library lives in this browser. Sync and backups keep it safe everywhere else.</p>
      </header>

      <SyncSection />
      <BackupSection />
      <GoalSection />

      <Card icon="key" title="Data sources" subtitle="Where each world gets its data.">
        <ul className="divide-y divide-line overflow-hidden rounded-ui ring-1 ring-line">
          {keys.map((k) => (
            <li key={k.label} className="flex flex-wrap items-center justify-between gap-2 bg-surface-2/50 px-4 py-3 text-sm">
              <span>
                <span className="font-semibold text-fg">{k.label}</span>
                <span className="text-muted"> · {k.worlds}</span>
              </span>
              <span className={cn('flex items-center gap-1.5 text-xs font-semibold', k.ok ? 'text-emerald-400' : 'text-red-400')}>
                <Icon name={k.ok ? 'checkCircle' : 'alert'} className="h-4 w-4" />
                {k.ok ? 'Connected' : 'Missing key'}
                {k.note && <span className="text-muted">· {k.note}</span>}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">
          Add missing keys to <code className="rounded bg-surface-2 px-1 py-0.5">.env</code> (see{' '}
          <code className="rounded bg-surface-2 px-1 py-0.5">.env.example</code>) and rebuild.
        </p>
      </Card>

      <Card icon="trash" title="Danger zone" tone="danger" subtitle={`You’re tracking ${items.length} title${items.length === 1 ? '' : 's'} across ${CATEGORIES.length} worlds.`}>
        <Button variant="danger" icon="trash" onClick={clearLocal} disabled={!items.length}>
          Clear library
        </Button>
      </Card>
    </div>
  )
}
