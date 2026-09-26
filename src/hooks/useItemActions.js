import { CATEGORY_BY_KEY, STATUS, statusLabel } from '../config/categories'
import { toast } from '../lib/toast'
import { isFinished, stepProgress } from '../lib/progress'
import { readRow, useLibrary } from './useLibrary'

const shortTitle = (t = '') => (t.length > 34 ? `${t.slice(0, 32).trim()}…` : t)

// Progress that represents "all of it" when an item is marked complete, so
// stats and progress bars agree with the status.
function fullProgress(item) {
  switch (item.category) {
    case 'tv':
      if (item.seasonEpisodes?.length) {
        return { season: item.seasonEpisodes.length, episode: item.seasonEpisodes.at(-1) }
      }
      return undefined
    case 'anime':
      return item.episodes ? { episode: item.episodes } : undefined
    case 'book':
      return item.pageCount ? { page: item.pageCount } : undefined
    default:
      return undefined
  }
}

// Every library action for one item, with confirmation toasts and Undo.
// Cards, heroes and detail pages all go through here so feedback is
// consistent across worlds.
export function useItemActions(item) {
  const lib = useLibrary()
  const category = CATEGORY_BY_KEY[item.category]
  const entry = lib.getEntry(item.category, item.externalId)
  const status = entry?.status ?? null

  const undo = (prev) => ({
    label: 'Undo',
    onClick: () => (prev ? lib.restore(prev) : lib.remove(item.category, item.externalId)),
  })

  function setStatus(next) {
    const prev = readRow(item.category, item.externalId)
    // Choosing the current status again removes the item.
    if (prev?.status === next) {
      lib.remove(item.category, item.externalId)
      toast(`Removed from ${statusLabel(category, next)}`, { icon: 'trash', action: undo(prev) })
      return
    }
    const patch = { status: next }
    if (next === STATUS.COMPLETED) {
      const full = fullProgress(item)
      if (full) patch.progress = full
    }
    lib.update(item, patch)
    const [msg, icon] =
      next === STATUS.WISHLIST
        ? [`Added to ${category.verbs.plan}`, 'bookmark']
        : next === STATUS.IN_PROGRESS
          ? [`Now ${category.verbs.progress.toLowerCase()}`, 'play']
          : [`Marked as ${category.verbs.done.toLowerCase()}`, 'check']
    toast(`${msg} · ${shortTitle(item.title)}`, { icon, action: undo(prev) })
  }

  function remove() {
    const prev = readRow(item.category, item.externalId)
    if (!prev) return
    lib.remove(item.category, item.externalId)
    toast(`Removed · ${shortTitle(item.title)}`, { icon: 'trash', action: undo(prev) })
  }

  function rate(stars) {
    const prev = readRow(item.category, item.externalId)
    lib.setRating(item, stars)
    toast(stars == null ? 'Rating cleared' : `Rated ${stars}★ · ${shortTitle(item.title)}`, {
      icon: 'star',
      action: undo(prev),
    })
  }

  function toggleFavorite() {
    const prev = readRow(item.category, item.externalId)
    const next = !prev?.favorite
    lib.update(item, { favorite: next }, STATUS.COMPLETED)
    toast(next ? `Added to favorites · ${shortTitle(item.title)}` : 'Removed from favorites', {
      icon: 'heart',
      action: undo(prev),
    })
  }

  function setReview(text) {
    lib.update(item, { review: text?.trim() ? text.trim() : null }, STATUS.COMPLETED)
    toast('Review saved', { icon: 'pen' })
  }

  // Set progress explicitly (page 212, S2·E4, 38 hours). Starting progress on
  // an unsaved or planned item moves it to in-progress; reaching the end
  // completes it.
  function setProgress(progress, { silent = false } = {}) {
    const prev = readRow(item.category, item.externalId)
    const finished = isFinished(item, progress)
    const patch = { progress }
    if (finished && prev?.status !== STATUS.COMPLETED) patch.status = STATUS.COMPLETED
    else if (!prev || prev.status === STATUS.WISHLIST) patch.status = STATUS.IN_PROGRESS
    lib.update(item, patch, STATUS.IN_PROGRESS)
    if (finished && prev?.status !== STATUS.COMPLETED) {
      toast(`Finished! ${shortTitle(item.title)} — rate it?`, { icon: 'trophy', action: undo(prev) })
    } else if (!silent) {
      toast(progressMessage(item.category, progress), { icon: 'check', action: undo(prev) })
    }
  }

  // +1 episode / +10 pages / +1 hour, built on the freshest stored progress.
  function bump(step) {
    const prev = readRow(item.category, item.externalId)
    const current = { ...item, _progress: prev?.progress ?? item._progress ?? null }
    const next = stepProgress(current, step)
    if (next) setProgress(next)
  }

  return {
    category,
    entry,
    status,
    isSaved: Boolean(entry),
    favorite: Boolean(entry?.favorite),
    userRating: entry?.user_rating ?? null,
    progress: entry?.progress ?? null,
    setStatus,
    remove,
    rate,
    toggleFavorite,
    setReview,
    setProgress,
    bump,
  }
}

function progressMessage(category, p) {
  switch (category) {
    case 'tv':
      return `Watched S${p.season} · E${p.episode}`
    case 'anime':
      return `Watched episode ${p.episode}`
    case 'book':
      return `On page ${p.page}`
    case 'game':
      return `${p.hours} hours played`
    default:
      return 'Progress saved'
  }
}
