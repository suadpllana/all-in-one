// Which item's note editor is open (one at a time, app-wide). Lists, cards
// and the "Marked as watched · Add note" toast all open it through here; the
// modal itself is rendered once by <NoteEditorHost/> in the layout.

let current = null
const listeners = new Set()

// Unsaved text per item, so closing the editor by accident doesn't lose a
// half-written note (kept for this visit only).
const drafts = new Map()

function emit() {
  for (const fn of listeners) fn()
}

export function openNote(item) {
  current = item
  emit()
}

export function closeNote() {
  current = null
  emit()
}

export function subscribeNote(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getNoteItem() {
  return current
}

const draftKey = (item) => `${item.category}:${item.externalId}`

export function getDraft(item) {
  return drafts.get(draftKey(item))
}

export function setDraft(item, text) {
  if (text == null) drafts.delete(draftKey(item))
  else drafts.set(draftKey(item), text)
}
