import { STATUS } from '../config/categories'

// Icon for a status in a given world (eye = watched film, book = reading…).
const PROGRESS_ICON = { book: 'book', game: 'gamepad' }

export function statusIcon(category, status) {
  if (status === STATUS.IN_PROGRESS) return PROGRESS_ICON[category] || 'play'
  if (status === STATUS.COMPLETED) return category === 'movie' ? 'eye' : 'check'
  return 'bookmark'
}
