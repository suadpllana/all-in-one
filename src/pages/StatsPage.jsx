import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES, STATUS } from '../config/categories'
import { useLibrary } from '../hooks/useLibrary'
import { useDocumentTitle, useTheme } from '../hooks/useTheme'
import { rowToItem } from '../lib/rowToItem'
import { computeStats } from '../lib/stats'
import MediaCard from '../components/cards/MediaCard'
import { ChartCard, ColumnChart, DataTable, HBarChart, Legend, StackedBars } from '../components/charts/Charts'
import { Button } from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import Rail from '../components/ui/Rail'
import { SectionHeader } from '../components/ui/Section'
import { EmptyState } from '../components/ui/States'

// Chart colours, validated with the dataviz script on the dark surface
// (#14141d): one hue for single-series charts, a 3-step ordinal ramp for
// saved -> in progress -> finished.
const VIZ = {
  '--viz-1': '#8b7bff',
}
const STAGES = [
  { name: 'Saved', color: '#4a3fa8', ink: 'light' },
  { name: 'In progress', color: '#7b6cf6', ink: 'light' },
  { name: 'Finished', color: '#b9b0ff', ink: 'dark' },
]

// Cross-world "year in review" dashboard.
export default function StatsPage() {
  useTheme('home')
  useDocumentTitle('My stats')
  const { items, isLoading } = useLibrary()
  const s = useMemo(() => computeStats(items), [items])
  const favorites = useMemo(() => items.filter((r) => r.favorite).map(rowToItem), [items])

  const months = useMemo(() => {
    const out = []
    const d = new Date()
    d.setDate(1)
    for (let i = 11; i >= 0; i--) {
      const m = new Date(d.getFullYear(), d.getMonth() - i, 1)
      const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`
      out.push({
        key,
        label: m.toLocaleString('en', { month: 'narrow' }),
        full: m.toLocaleString('en', { month: 'long', year: 'numeric' }),
        value: s.byMonth.get(key) || 0,
      })
    }
    return out
  }, [s])

  const hours = CATEGORIES.filter((c) => s.byCategory[c.key].total > 0)
    .map((c) => ({ label: c.label, icon: c.icon, value: Math.round(s.byCategory[c.key].minutes / 60) }))
    .sort((a, b) => b.value - a.value)
  const stacks = CATEGORIES.filter((c) => s.byCategory[c.key].total > 0).map((c) => {
    const b = s.byCategory[c.key]
    return { label: c.label, icon: c.icon, parts: [b.planned, b.inProgress, b.completed] }
  })
  const ratings = s.ratingHistogram.map((n, i) => ({ label: `${(i + 1) / 2}`, full: `${(i + 1) / 2} stars`, value: n }))
  const rated = s.ratingHistogram.reduce((a, b) => a + b, 0)

  if (!isLoading && !items.length) {
    return (
      <div className="shell page-in py-16">
        <EmptyState icon="chart" title="Your stats start with your first title" hint="Add films, shows, books and games to your lists and this page fills itself in.">
          <Button as={Link} to="/" variant="primary" icon="home">
            Go explore
          </Button>
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="shell page-in space-y-12 pb-10 pt-8 md:pt-12" style={VIZ}>
      <header>
        <p className="kicker text-accent">Your vault, in numbers</p>
        <h1 className="mt-2 text-5xl font-extrabold tracking-[-0.045em] text-fg md:text-6xl">My Stats</h1>
      </header>

      {/* KPI row — the hero figure leads, in the same sans as everything. */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-card bg-surface p-6 ring-1 ring-line sm:col-span-2 lg:row-span-2 lg:flex lg:flex-col lg:justify-between">
          <p className="text-sm font-semibold text-muted">Finished in {new Date().getFullYear()}</p>
          <p className="mt-2 text-7xl font-bold tracking-tight text-fg md:text-8xl">{s.thisYear}</p>
          <p className="mt-3 text-sm text-fg-2">
            {s.completed} finished all-time · {s.hours.toLocaleString()} hours across every world
          </p>
        </div>
        <Tile label="Hours logged" value={s.hours.toLocaleString()} icon="clock" />
        <Tile label="Activity streak" value={`${s.streak} day${s.streak === 1 ? '' : 's'}`} icon="flame" />
        <Tile label="In progress" value={s.inProgress} icon="play" />
        <Tile label="Saved for later" value={s.planned} icon="bookmark" />
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard
          title="Where your time goes"
          subtitle="Estimated hours by world, from runtimes, episodes, pages and playtime"
          table={<DataTable columns={['World', 'Hours']} rows={hours.map((h) => [h.label, h.value.toLocaleString()])} />}
        >
          <HBarChart data={hours} format={(v) => `${v.toLocaleString()}h`} />
        </ChartCard>

        <ChartCard
          title="Your year"
          subtitle="Titles finished per month, last 12 months"
          table={<DataTable columns={['Month', 'Finished']} rows={months.map((m) => [m.full, m.value])} />}
        >
          <ColumnChart data={months} />
        </ChartCard>

        <ChartCard
          title="Your library by world"
          subtitle="Saved, in progress and finished"
          legend={<Legend series={STAGES} />}
          table={
            <DataTable
              columns={['World', 'Saved', 'In progress', 'Finished']}
              rows={stacks.map((r) => [r.label, ...r.parts])}
            />
          }
        >
          <StackedBars rows={stacks} series={STAGES} />
        </ChartCard>

        <ChartCard
          title="How you rate"
          subtitle={rated ? `${rated} rating${rated === 1 ? '' : 's'}, in half stars` : 'Rate what you finish to see your curve'}
          table={<DataTable columns={['Stars', 'Titles']} rows={ratings.map((r) => [r.full, r.value])} />}
        >
          <ColumnChart data={ratings} />
        </ChartCard>
      </section>

      <section>
        <SectionHeader title="By world" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((c) => {
            const b = s.byCategory[c.key]
            return (
              <Link
                key={c.key}
                to={c.route}
                data-accent={c.key}
                className="group rounded-card bg-surface p-5 ring-1 ring-line transition-all hover:-translate-y-0.5 hover:ring-accent-line"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-ui bg-accent-soft text-accent">
                      <Icon name={c.icon} className="h-5 w-5" />
                    </span>
                    <span className="display text-2xl text-fg">{c.label}</span>
                  </span>
                  <Icon name="arrowRight" className="h-4 w-4 text-muted transition-transform group-hover:translate-x-1" />
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Mini label={c.verbs.done} value={b.completed} />
                  <Mini label={c.noProgress ? 'Hours' : c.verbs.progress} value={c.noProgress ? Math.round(b.minutes / 60) : b.inProgress} />
                  <Mini label="Saved" value={b.planned} />
                </dl>
                {b.avgRating != null && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
                    <Icon name="starFill" className="h-3.5 w-3.5 text-gold" />
                    {b.avgRating.toFixed(1)} average rating · {b.favorites} favorite{b.favorites === 1 ? '' : 's'}
                  </p>
                )}
              </Link>
            )
          })}
          <TopWorld hours={hours} />
        </div>
      </section>

      {favorites.length > 0 && (
        <section>
          <SectionHeader kicker="The ones you loved" title="Favorites" icon="heartFill" />
          <Rail label="Favorites" className="items-start">
            {favorites.map((i) => (
              <MediaCard key={`${i.category}:${i.externalId}`} item={i} accent rail size="sm" />
            ))}
          </Rail>
        </section>
      )}

      {items.some((r) => r.status === STATUS.DROPPED) && (
        <p className="text-sm text-muted">Dropped titles are counted in totals but not in progress.</p>
      )}
    </div>
  )
}

// Fills the grid's eighth cell with the one insight people look for first:
// which world takes most of their time, and how much of it.
function TopWorld({ hours }) {
  const total = hours.reduce((n, h) => n + h.value, 0)
  const top = hours[0]
  if (!top || !total) return null
  const c = CATEGORIES.find((x) => x.label === top.label)
  return (
    <Link
      to={c.route}
      data-accent={c.key}
      className="group relative flex flex-col justify-between overflow-hidden rounded-card bg-surface p-5 ring-1 ring-accent-line transition-all hover:-translate-y-0.5"
    >
      <div aria-hidden="true" className="bg-accent-grad absolute inset-0 opacity-[0.14]" />
      <p className="kicker relative text-accent">Most of your time</p>
      <div className="relative mt-4">
        <p className="display text-3xl text-fg">{c.label}</p>
        <p className="mt-1 text-sm text-fg-2">
          {top.value.toLocaleString()}h · {Math.round((top.value / total) * 100)}% of all your hours
        </p>
      </div>
    </Link>
  )
}

function Tile({ label, value, icon }) {
  return (
    <div className="rounded-card bg-surface p-5 ring-1 ring-line">
      <p className="flex items-center gap-2 text-sm font-semibold text-muted">
        <Icon name={icon} className="h-4 w-4" />
        {label}
      </p>
      <p className="mt-2 text-4xl font-bold tracking-tight text-fg">{value}</p>
    </div>
  )
}

function Mini({ label, value }) {
  return (
    <div className="rounded-ui bg-surface-2 px-2 py-2.5">
      <dd className="text-xl font-bold text-fg">{value}</dd>
      <dt className="mt-0.5 truncate text-[11px] text-muted">{label}</dt>
    </div>
  )
}
