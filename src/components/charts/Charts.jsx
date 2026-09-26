import { useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import Icon from '../ui/Icon'

// Small, dependency-free charts for the Stats page, built to the dataviz
// specs: thin marks (<= 24px) with a 4px rounded data-end and square
// baseline, 2px surface gaps between touching segments, recessive solid
// hairline grid, labels in text tokens, per-mark hover/focus tooltips, and
// a table-view twin for every chart (ChartCard's toggle).
//
// Colours are CSS custom properties on the page (validated with the dataviz
// script against the dark surface): --viz-1 single-series hue, and an
// ordinal ramp --viz-o1..3 (saved -> in progress -> finished).

export function ChartCard({ title, subtitle, table, children, className, legend }) {
  const [asTable, setAsTable] = useState(false)
  return (
    <figure className={cn('rounded-card bg-surface p-5 ring-1 ring-line md:p-6', className)}>
      <div className="flex items-start justify-between gap-4">
        <figcaption>
          <h3 className="text-lg font-bold text-fg">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </figcaption>
        {table && (
          <button
            type="button"
            onClick={() => setAsTable((v) => !v)}
            aria-pressed={asTable}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-ui px-2.5 text-xs font-semibold text-muted ring-1 ring-line hover:text-fg"
          >
            <Icon name={asTable ? 'chart' : 'list'} className="h-3.5 w-3.5" />
            {asTable ? 'Chart' : 'Table'}
          </button>
        )}
      </div>
      {legend && !asTable && <div className="mt-4">{legend}</div>}
      <div className="mt-5">{asTable ? table : children}</div>
    </figure>
  )
}

export function DataTable({ columns, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
            {columns.map((c, i) => (
              <th key={c} className={cn('py-2 font-semibold', i > 0 && 'text-right')}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} className="border-b border-line/60 last:border-0">
              {r.map((cell, i) => (
                <td key={i} className={cn('py-2 text-fg-2', i > 0 && 'text-right tabular-nums', i === 0 && 'font-medium text-fg')}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Shared hover/focus tooltip: value first (strong), label second.
function useTip() {
  const box = useRef(null)
  const [tip, setTip] = useState(null)
  const place = (el, content) => {
    const b = box.current?.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    if (!b) return
    setTip({ x: r.left - b.left + r.width / 2, y: r.top - b.top, ...content })
  }
  const bind = (content) => ({
    tabIndex: 0,
    onPointerEnter: (e) => place(e.currentTarget, content),
    onPointerLeave: () => setTip(null),
    onFocus: (e) => place(e.currentTarget, content),
    onBlur: () => setTip(null),
    'aria-label': `${content.label}: ${content.value}`,
  })
  const node = tip && (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-bg-elev px-2.5 py-1.5 shadow-xl ring-1 ring-line"
      style={{ left: tip.x, top: tip.y - 8 }}
    >
      <p className="text-sm font-bold text-fg">{tip.value}</p>
      <p className="text-xs text-muted">{tip.label}</p>
    </div>
  )
  return { box, bind, node }
}

// Space kept at the end of a horizontal bar row for its value label.
const VALUE_ROOM = '3.5rem'

// Horizontal bars, one series (single hue). Value at the tip.
export function HBarChart({ data, format = (v) => v }) {
  const { box, bind, node } = useTip()
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div ref={box} className="relative space-y-3">
      {data.map((d) => (
        <div key={d.label} className="grid grid-cols-[112px_1fr] items-center gap-3 sm:grid-cols-[140px_1fr]">
          <span className="flex min-w-0 items-center gap-2 text-sm text-fg-2">
            {d.icon && <Icon name={d.icon} className="h-4 w-4 shrink-0 text-muted" />}
            <span className="truncate">{d.label}</span>
          </span>
          <div className="flex min-w-0 items-center gap-2">
            {/* Scaled within the row minus room for the value, and never
                shrunk by it — so lengths stay proportional at any width. */}
            <div
              {...bind({ label: d.label, value: format(d.value) })}
              className="h-3.5 shrink-0 rounded-r-[4px] bg-[var(--viz-1)] outline-none transition-[filter] hover:brightness-125 focus-visible:brightness-125"
              style={{ width: `calc((100% - ${VALUE_ROOM}) * ${d.value / max})`, minWidth: d.value ? 3 : 0 }}
            />
            <span className="shrink-0 text-xs font-semibold tabular-nums text-fg-2">{format(d.value)}</span>
          </div>
        </div>
      ))}
      {node}
    </div>
  )
}

// Vertical columns over time, one series. Hairline grid with clean ticks;
// only the peak carries a direct label — tooltips + table carry the rest.
export function ColumnChart({ data, height = 180 }) {
  const { box, bind, node } = useTip()
  const max = Math.max(1, ...data.map((d) => d.value))
  const step = niceStep(max)
  const top = Math.ceil(max / step) * step
  const ticks = []
  for (let v = 0; v <= top; v += step) ticks.push(v)
  const peak = data.reduce((best, d, i) => (d.value > (data[best]?.value ?? -1) ? i : best), 0)

  return (
    <div ref={box} className="relative pt-4">
      <div className="relative" style={{ height }}>
        {/* Zero-height rows centre each tick label on its gridline. */}
        {ticks.map((t) => (
          <div key={t} className="absolute inset-x-0 flex h-0 items-center gap-2" style={{ bottom: `${(t / top) * 100}%` }}>
            <span className="w-6 text-right text-[11px] tabular-nums text-muted">{t}</span>
            <span className="h-px flex-1 bg-line/70" />
          </div>
        ))}
        <div className="absolute inset-y-0 left-8 right-0 flex items-end justify-around gap-1">
          {data.map((d, i) => (
            <div key={d.key ?? d.label} className="flex h-full w-full max-w-6 items-end">
              <div
                {...bind({ label: d.full || d.label, value: `${d.value} finished` })}
                className="relative w-full rounded-t-[4px] bg-[var(--viz-1)] outline-none transition-[filter] hover:brightness-125 focus-visible:brightness-125"
                style={{ height: `${(d.value / top) * 100}%`, minHeight: d.value ? 3 : 0 }}
              >
                {/* The peak's direct label sits above the bar, out of flow,
                    so it never shortens it. */}
                {i === peak && d.value > 0 && (
                  <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-[11px] font-bold text-fg">{d.value}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="ml-8 mt-2 flex justify-around gap-1">
        {data.map((d) => (
          <span key={d.key ?? d.label} className="w-full max-w-6 text-center text-[11px] text-muted">
            {d.label}
          </span>
        ))}
      </div>
      {node}
    </div>
  )
}

function niceStep(max) {
  const raw = max / 4
  const mag = 10 ** Math.floor(Math.log10(raw || 1))
  const n = raw / mag
  return Math.max(1, (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag)
}

// Horizontal stacked bars (ordinal parts), 2px surface gaps between
// segments; in-segment labels only when they fit.
export function StackedBars({ rows, series }) {
  const { box, bind, node } = useTip()
  const max = Math.max(1, ...rows.map((r) => r.parts.reduce((a, b) => a + b, 0)))
  return (
    <div ref={box} className="relative space-y-3.5">
      {rows.map((r) => {
        const total = r.parts.reduce((a, b) => a + b, 0)
        return (
          <div key={r.label} className="grid grid-cols-[112px_1fr] items-center gap-3 sm:grid-cols-[140px_1fr]">
            <span className="flex min-w-0 items-center gap-2 text-sm text-fg-2">
              {r.icon && <Icon name={r.icon} className="h-4 w-4 shrink-0 text-muted" />}
              <span className="truncate">{r.label}</span>
            </span>
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-5 shrink-0 gap-[2px]" style={{ width: `calc((100% - ${VALUE_ROOM}) * ${total / max})` }}>
                {r.parts.map((v, i) =>
                  v > 0 ? (
                    <div
                      key={series[i].name}
                      {...bind({ label: `${r.label} · ${series[i].name}`, value: v })}
                      className={cn(
                        'grid h-full place-items-center overflow-visible outline-none transition-[filter] hover:brightness-125 focus-visible:brightness-125',
                        i === r.parts.findLastIndex((x) => x > 0) && 'rounded-r-[4px]',
                      )}
                      style={{ flexGrow: v, flexBasis: 0, background: series[i].color }}
                    >
                      {v / max > 0.07 && (
                        <span className={cn('text-[11px] font-bold', series[i].ink === 'dark' ? 'text-[#0b0b10]' : 'text-white')}>
                          {v}
                        </span>
                      )}
                    </div>
                  ) : null,
                )}
              </div>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-fg-2">{total || ''}</span>
            </div>
          </div>
        )
      })}
      {node}
    </div>
  )
}

export function Legend({ series }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-fg-2">
      {series.map((s) => (
        <li key={s.name} className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-[3px]" style={{ background: s.color }} />
          {s.name}
        </li>
      ))}
    </ul>
  )
}
