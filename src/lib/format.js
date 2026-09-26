// Display formatting shared across worlds.

export { formatMinutes } from './duration'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "2024-10-17" (or Date) -> Date, tolerating year-only strings.
export function toDate(v) {
  if (!v) return null
  if (v instanceof Date) return v
  const s = String(v)
  if (/^\d{4}$/.test(s)) return new Date(Number(s), 0, 1)
  // Date-only strings are UTC midnight; read them as local calendar dates.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDate(v, { year = true } = {}) {
  const d = toDate(v)
  if (!d) return null
  return `${MONTHS[d.getMonth()]} ${d.getDate()}${year ? `, ${d.getFullYear()}` : ''}`
}

export function monthDay(v) {
  const d = toDate(v)
  return d ? { month: MONTHS[d.getMonth()].toUpperCase(), day: d.getDate() } : null
}

export function monthYear(v) {
  const d = toDate(v)
  return d ? `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][d.getMonth()]} ${d.getFullYear()}` : ''
}

// "3 weeks ago"
export function timeAgo(v) {
  const d = toDate(v)
  if (!d) return ''
  const s = Math.round((Date.now() - d.getTime()) / 1000)
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [name, secs] of units) {
    const n = Math.floor(s / secs)
    if (n >= 1) return `${n} ${name}${n > 1 ? 's' : ''} ago`
  }
  return 'just now'
}

// Seconds until something -> "2d 4h" / "5h 12m" / "12m".
export function countdown(seconds) {
  if (seconds == null) return null
  if (seconds <= 0) return 'now'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d) return `${d}d ${h}h`
  if (h) return `${h}h ${m}m`
  return `${m}m`
}

// Days from today until a date (negative = past).
export function daysUntil(v) {
  const d = toDate(v)
  if (!d) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / 86400000)
}

// 1234567 -> "1.2M"
export function compact(n) {
  if (n == null || Number.isNaN(Number(n))) return null
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(n))
}

export function money(n) {
  if (!n) return null
  return new Intl.NumberFormat('en', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

// Metacritic-style colour band.
export function scoreTone(score100) {
  if (score100 == null) return 'bg-white/15 text-white'
  if (score100 >= 75) return 'bg-[#2fbf4a] text-black'
  if (score100 >= 50) return 'bg-[#f5c518] text-black'
  return 'bg-[#e5383b] text-white'
}

export const LANGUAGES = {
  en: 'English', ja: 'Japanese', ko: 'Korean', fr: 'French', es: 'Spanish', de: 'German', it: 'Italian',
  zh: 'Chinese', hi: 'Hindi', pt: 'Portuguese', ru: 'Russian', sv: 'Swedish', da: 'Danish', no: 'Norwegian',
  pl: 'Polish', tr: 'Turkish', ar: 'Arabic', fa: 'Persian', th: 'Thai', id: 'Indonesian', nl: 'Dutch',
}

export function greeting(date = new Date()) {
  const h = date.getHours()
  if (h < 5) return 'Up late'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

// Spine thickness (px) scales with page count, so a doorstop looks like one.
export function bookThickness(pages) {
  return Math.round(Math.min(26, Math.max(7, (pages || 300) / 26)))
}
