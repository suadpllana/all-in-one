import { useState } from 'react'
import { STATUS } from '../../config/categories'
import { useItemActions } from '../../hooks/useItemActions'
import { cn } from '../../lib/cn'
import { getProgress, stepLabel, stepSize } from '../../lib/progress'
import { Button, IconButton } from '../ui/Button'
import { ProgressBar } from '../ui/Progress'

// "Where am I?" tracker for worlds with progress: episodes (TV, anime),
// pages (books) or hours (games). Shown on detail pages once an item is in
// progress (or offered to start it).
export default function ProgressControl({ item, className, title = 'Your progress' }) {
  const a = useItemActions(item)
  const merged = { ...item, _progress: a.progress }
  const info = getProgress(merged)
  if (!info) return null
  const started = a.status === STATUS.IN_PROGRESS || (a.progress && a.status !== STATUS.COMPLETED)
  const done = a.status === STATUS.COMPLETED

  return (
    <div className={cn('rounded-card bg-surface p-5 ring-1 ring-line', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-xl text-fg">{title}</h3>
        <span className="text-sm font-semibold text-muted">
          {info.total ? `${Math.round(Math.min(1, info.pct) * 100)}%` : ''}
        </span>
      </div>
      <p className="mt-1 text-sm text-fg-2">
        {done ? 'Finished' : info.detail}
        {info.left && !done ? <span className="text-muted"> · {info.left}</span> : null}
      </p>
      <ProgressBar value={done ? 1 : (info.pct ?? 0)} className="mt-3 h-2" />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {item.category === 'book' && <PageInput key={a.progress?.page ?? 0} item={merged} onSet={(page) => a.setProgress({ page })} />}
        {(item.category === 'anime' || item.category === 'game') && (
          <Stepper
            value={item.category === 'anime' ? a.progress?.episode || 0 : a.progress?.hours || 0}
            unit={item.category === 'anime' ? 'ep' : 'h'}
            onMinus={() => a.bump(-1)}
            onPlus={() => a.bump(1)}
          />
        )}
        <Button variant={started ? 'primary' : 'surface'} size="md" icon="plus" onClick={() => a.bump(stepSize(item.category))}>
          {started ? stepLabel(item.category) : item.category === 'book' ? 'Start reading' : item.category === 'game' ? 'Start playing' : 'Start watching'}
        </Button>
        {item.category === 'tv' && info.next && !done && (
          <span className="text-sm text-muted">
            Next up <span className="font-semibold text-fg">{info.next}</span>
          </span>
        )}
      </div>
    </div>
  )
}

function Stepper({ value, unit, onMinus, onPlus }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-ui bg-surface-2 p-1 ring-1 ring-line">
      <IconButton icon="minus" label="Decrease" size="sm" onClick={onMinus} disabled={!value} />
      <span className="min-w-14 text-center font-display text-lg tabular-nums text-fg">
        {value}
        <span className="ml-0.5 text-xs text-muted">{unit}</span>
      </span>
      <IconButton icon="plus" label="Increase" size="sm" onClick={onPlus} />
    </div>
  )
}

// Page number entry + slider, committed on blur / Enter / release.
function PageInput({ item, onSet }) {
  const stored = item._progress?.page || 0
  const total = item.pageCount || 0
  const [page, setPage] = useState(stored)
  const commit = (v) => {
    const n = Math.max(0, Math.min(total || Infinity, Math.round(Number(v) || 0)))
    if (n !== stored) onSet(n)
  }
  return (
    <div className="flex w-full flex-wrap items-center gap-3">
      {total > 0 && (
        <input
          type="range"
          min={0}
          max={total}
          value={page}
          onChange={(e) => setPage(Number(e.target.value))}
          onMouseUp={(e) => commit(e.currentTarget.value)}
          onTouchEnd={(e) => commit(e.currentTarget.value)}
          onKeyUp={(e) => commit(e.currentTarget.value)}
          aria-label="Current page"
          className="range min-w-40 flex-1"
          style={{ '--pct': `${(page / total) * 100}%` }}
        />
      )}
      <label className="flex items-center gap-2 text-sm text-muted">
        Page
        <input
          inputMode="numeric"
          value={page}
          onChange={(e) => setPage(e.target.value.replace(/\D/g, ''))}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && commit(e.currentTarget.value)}
          className="h-9 w-20 rounded-ui bg-surface-2 px-3 text-center font-semibold tabular-nums text-fg ring-1 ring-line outline-none focus:ring-accent"
        />
        {total ? `of ${total}` : ''}
      </label>
    </div>
  )
}
