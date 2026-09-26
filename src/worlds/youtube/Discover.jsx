import { Link, useSearchParams } from 'react-router-dom'
import { youtube } from '../../api/youtube'
import { STATUS } from '../../config/categories'
import { useRecommended, useSection, useWorldQuery } from '../../hooks/useDiscover'
import { useItemActions } from '../../hooks/useItemActions'
import { cn } from '../../lib/cn'
import { compact, timeAgo } from '../../lib/format'
import { gridClass } from '../../lib/grid'
import { detailPath } from '../../lib/paths'
import VideoCard, { ChannelAvatar } from '../../components/cards/VideoCard'
import { Button } from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Img from '../../components/ui/Img'
import { SectionHeader } from '../../components/ui/Section'
import { GridSkeleton, Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/States'

// YouTube — "the video platform". Topic chips across the top (all, essays,
// podcasts, or a single creator), a featured video, the creators you follow
// here, and 16:9 video grids with durations, views and age.
export default function YouTubeDiscover() {
  const [params, setParams] = useSearchParams()
  const chip = params.get('chip') || 'all'
  const latest = useSection('youtube', 'newReleases')
  const podcasts = useSection('youtube', 'trending', { enabled: chip === 'all' || chip === 'podcasts' })
  const top = useSection('youtube', 'topRated', { enabled: chip === 'all' })
  const recommended = useRecommended('youtube')
  const creators = useWorldQuery(['yt-creators'], (signal) => youtube.creators(signal))
  const channel = (creators.data || []).find((c) => c.id === chip)

  const select = (key) => setParams(key === 'all' ? {} : { chip: key })

  return (
    <div className="shell pb-6 pt-6">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        <Chip active={chip === 'all'} onClick={() => select('all')}>All</Chip>
        <Chip active={chip === 'essays'} onClick={() => select('essays')}>Video essays</Chip>
        <Chip active={chip === 'podcasts'} onClick={() => select('podcasts')}>Podcasts</Chip>
        {(creators.data || []).map((c) => (
          <Chip key={c.id} active={chip === c.id} onClick={() => select(c.id)}>
            {c.title}
          </Chip>
        ))}
      </div>

      <div className="mt-8 space-y-14">
        {chip === 'all' && (
          <>
            <Featured query={latest} />
            <Creators query={creators} onPick={select} />
            <Grid kicker="From the creators" title="Latest Uploads" query={latest} limit={8} />
            <Grid kicker="Long-form conversations" title="Popular Podcasts" query={podcasts} limit={8} />
            <Grid kicker="All-time" title="Most Viewed" query={top} limit={8} />
            <Grid kicker="Based on your channels" title="Recommended For You" query={recommended} limit={8} hideWhenEmpty />
          </>
        )}
        {chip === 'essays' && <Grid title="Video Essays" query={latest} />}
        {chip === 'podcasts' && <Grid title="Podcasts" query={podcasts} />}
        {channel && <ChannelPage channel={channel} />}
      </div>
    </div>
  )
}

function Chip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'h-9 shrink-0 rounded-lg px-3.5 text-sm font-semibold transition-colors',
        active ? 'bg-fg text-bg' : 'bg-surface-2 text-fg hover:bg-line',
      )}
    >
      {children}
    </button>
  )
}

/* -------------------------------------------------------------- featured */

function Featured({ query }) {
  const { data, isLoading } = query
  const v = data?.[0]
  if (isLoading) return <Skeleton className="aspect-[21/9] w-full rounded-2xl" />
  if (!v) return null
  return <FeaturedCard v={v} />
}

function FeaturedCard({ v }) {
  const a = useItemActions(v)
  const saved = a.status === STATUS.WISHLIST
  return (
    <section className="rise grid grid-cols-1 gap-6 rounded-3xl bg-surface p-4 ring-1 ring-line md:p-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <Link to={detailPath(v)} className="group relative block overflow-hidden rounded-2xl">
        <Img src={v.backdropUrl || v.posterUrl} title={v.title} eager className="aspect-video w-full" imgClassName="transition-transform duration-700 group-hover:scale-[1.03]" />
        <span className="absolute inset-0 grid place-items-center bg-black/10 transition-colors group-hover:bg-black/30">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-accent text-white shadow-2xl transition-transform group-hover:scale-110">
            <Icon name="playFill" className="ml-1 h-7 w-7" />
          </span>
        </span>
        {v.durationLabel && <span className="absolute bottom-3 right-3 rounded-md bg-black/80 px-2 py-0.5 text-sm font-semibold text-white">{v.durationLabel}</span>}
      </Link>
      <div className="flex flex-col py-1 lg:py-3">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent">
          <span className="h-2 w-2 rounded-full bg-accent" /> Featured · new upload
        </p>
        <h1 className="mt-3 font-display text-3xl leading-tight text-fg md:text-4xl">{v.title}</h1>
        <div className="mt-4 flex items-center gap-3">
          <ChannelAvatar name={v.channelTitle} src={v.channelAvatar} className="h-10 w-10" />
          <div>
            <p className="font-semibold text-fg">{v.channelTitle}</p>
            <p className="text-sm text-muted">{[v.views != null ? `${compact(v.views)} views` : null, timeAgo(v.publishedAt)].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
        <p className="mt-4 line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-fg-2">{v.overview}</p>
        <div className="mt-auto flex flex-wrap gap-2.5 pt-6">
          <Button as={Link} to={detailPath(v)} variant="primary" icon="playFill">
            Watch now
          </Button>
          <Button variant="surface" icon={saved ? 'check' : 'clock'} onClick={() => a.setStatus(STATUS.WISHLIST)}>
            {saved ? 'In Watch Later' : 'Watch later'}
          </Button>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- creators */

function Creators({ query, onPick }) {
  const list = query.data || []
  if (!query.isLoading && !list.length) return null
  return (
    <section className="rise">
      <SectionHeader kicker="Hand-picked" title="Creators" subtitle="Essayists and storytellers worth subscribing to" />
      <div className="no-scrollbar -mx-4 flex gap-6 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
        {query.isLoading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-28 shrink-0 rounded-full" />)
          : list.map((c) => (
              <button key={c.id} type="button" onClick={() => onPick(c.id)} className="group w-28 shrink-0 text-center">
                <ChannelAvatar name={c.title} src={c.avatar} className="mx-auto h-24 w-24 text-3xl ring-2 ring-transparent transition-all group-hover:ring-accent" />
                <p className="mt-3 truncate text-sm font-semibold text-fg">{c.title}</p>
                {c.subs && <p className="text-xs text-muted">{compact(c.subs)} subscribers</p>}
              </button>
            ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ grid */

function Grid({ query, title, kicker, limit, hideWhenEmpty }) {
  const { data, isLoading, error, refetch } = query
  const items = (data || []).slice(0, limit)
  if (!isLoading && !error && !items.length && hideWhenEmpty) return null
  return (
    <section className="rise">
      <SectionHeader kicker={kicker} title={title} />
      {isLoading ? (
        <GridSkeleton shape="video" count={limit || 8} />
      ) : error ? (
        <ErrorState compact error={error} onRetry={refetch} />
      ) : (
        <div className={gridClass('video')}>
          {items.map((v, i) => (
            // A limited section fills whole rows: 6 at three columns, 8 at four.
            <VideoCard key={v.externalId} item={v} className={limit && i >= 6 ? 'lg:max-xl:hidden' : undefined} />
          ))}
        </div>
      )}
    </section>
  )
}

function ChannelPage({ channel }) {
  const q = useWorldQuery(['yt-channel', channel.id], (signal) => youtube.fromChannel(channel.id, signal))
  return (
    <section className="page-in">
      <div className="mb-8 flex items-center gap-5 rounded-3xl bg-surface p-6 ring-1 ring-line">
        <ChannelAvatar name={channel.title} src={channel.avatar} className="h-20 w-20 text-3xl" />
        <div>
          <h1 className="font-display text-3xl text-fg">{channel.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {[channel.handle, channel.subs ? `${compact(channel.subs)} subscribers` : null, channel.videoCount ? `${channel.videoCount} videos` : null].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
      <Grid title="Uploads" query={q} />
    </section>
  )
}
