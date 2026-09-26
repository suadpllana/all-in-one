import { genreLabels } from '../../lib/genres'

// A documentary's topics = its genres minus "Documentary" itself.
export function topicsOf(item) {
  return genreLabels(item, 4).filter((g) => g !== 'Documentary')
}

// Splits a synopsis into its opening sentence (the "deck") and the rest, so a
// feature can set the lead large without repeating it in the body. Needs a
// real sentence break (40+ chars, then a capital) so "U.S." doesn't split.
export function splitLead(text = '') {
  const t = (text || '').trim()
  const m = t.match(/^([\s\S]{40,}?[.!?]["”’)]?)\s+(?=[A-Z“"‘'(])([\s\S]+)$/)
  return m ? [m[1], m[2]] : [t, '']
}
