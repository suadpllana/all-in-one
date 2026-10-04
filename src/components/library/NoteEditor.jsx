import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { CATEGORY_BY_KEY, STATUS } from '../../config/categories'
import { useItemActions } from '../../hooks/useItemActions'
import { cn } from '../../lib/cn'
import { formatDate } from '../../lib/format'
import { closeNote, getDraft, getNoteItem, openNote, setDraft, subscribeNote } from '../../lib/noteEditor'
import { toStars } from '../../lib/rating'
import { Button, IconButton } from '../ui/Button'
import Icon from '../ui/Icon'
import Img from '../ui/Img'
import Modal from '../ui/Modal'
import { StarRatingInput } from '../ui/Stars'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

// Mounted once in the layout; shows the editor for whichever item asked.
export function NoteEditorHost() {
  const item = useSyncExternalStore(subscribeNote, getNoteItem)
  if (!item) return null
  return <NoteEditor key={`${item.category}:${item.externalId}`} item={item} />
}

// Your note on something you've finished: rating plus a few lines on what it
// was and what you thought, in the item's world colours.
function NoteEditor({ item }) {
  const a = useItemActions(item)
  const category = CATEGORY_BY_KEY[item.category]
  const saved = a.note || ''
  const restored = getDraft(item)
  const [text, setText] = useState(restored ?? saved)
  const [stars, setStars] = useState(() => toStars(a.userRating))
  const [touched, setTouched] = useState(false)
  // Inside the item's own world the page theme already speaks for it; from
  // Home, Search or another world, borrow the item's voice (accent + type).
  const [voice] = useState(() => (document.documentElement.dataset.theme === item.category ? undefined : item.category))
  const field = useRef(null)

  // Closing without saving keeps the draft for next time.
  const close = () => {
    setDraft(item, text.trim() && text !== saved ? text : null)
    closeNote()
  }

  // The modal focuses its panel when it opens; move on into the text.
  useEffect(() => {
    const el = field.current
    el?.focus()
    el?.setSelectionRange(el.value.length, el.value.length)
  }, [])

  const save = () => {
    a.saveNote(text, touched ? stars : undefined)
    setDraft(item, null)
    closeNote()
  }
  const remove = () => {
    a.saveNote('')
    setDraft(item, null)
    closeNote()
  }

  const wide = category?.shape === 'wide' || category?.shape === 'video'
  const done = a.status === STATUS.COMPLETED
  const when = done && a.entry?.completed_at ? formatDate(a.entry.completed_at) : null
  const byline = [item.year, item.authors?.[0], item.channelTitle, item.network].filter(Boolean).join(' · ')

  return (
    <Modal open bare onClose={close} label={`Your note on ${item.title || 'this'}`} className="w-[min(94vw,600px)]">
      <form
        data-accent={voice}
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
        // Ctrl/⌘ + Enter saves from anywhere in the editor, including after
        // clicking a star (which moves focus out of the text).
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            save()
          }
        }}
        className="relative max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-card bg-bg-elev p-5 text-fg shadow-2xl ring-1 ring-line sm:p-6"
      >
        <IconButton icon="x" label="Close" variant="ghost" size="sm" onClick={close} className="absolute right-3 top-3" />
        <header className="flex items-center gap-4 pr-8">
          <Img
            src={wide ? item.backdropUrl || item.posterUrl : item.posterUrl}
            title={item.title}
            className={cn('shrink-0 rounded-[min(var(--r-card),10px)] ring-1 ring-line', wide ? 'aspect-video w-28' : 'aspect-[2/3] w-16')}
          />
          <div className="min-w-0">
            <p className="kicker text-[11px] text-accent">{when ? `${category.verbs.done} ${when}` : 'Your note'}</p>
            <h2 className="mt-1 line-clamp-2 font-display text-2xl leading-tight text-fg">{item.title || 'Untitled'}</h2>
            {byline && <p className="mt-0.5 truncate text-sm text-muted">{byline}</p>}
          </div>
        </header>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Your rating</p>
          <div className="mt-2 flex items-center gap-3">
            <StarRatingInput
              value={stars}
              onRate={(v) => {
                setStars(v)
                setTouched(true)
              }}
              size={30}
            />
            {stars != null && <span className="text-sm font-bold text-gold">{stars} / 5</span>}
          </div>
        </div>

        <label className="mt-6 block">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Your note</span>
          <textarea
            ref={field}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            placeholder={category?.notePrompt || 'What did you think?'}
            className="mt-2 w-full resize-y rounded-[min(var(--r-ui),12px)] bg-surface p-3.5 font-read text-[15px] leading-relaxed text-fg outline-none ring-1 ring-line placeholder:text-muted focus:ring-2 focus:ring-accent"
          />
        </label>
        {restored != null && restored !== saved && <p className="mt-1.5 text-xs text-muted">Picked up your unsaved draft.</p>}

        <footer className="mt-5 flex flex-wrap items-center gap-2">
          {saved && (
            <Button type="button" variant="ghost" size="sm" icon="trash" onClick={remove} className="text-red-500 hover:text-red-500">
              Delete note
            </Button>
          )}
          <span className="ml-auto hidden text-xs text-muted sm:inline">{isMac ? '⌘' : 'Ctrl'} + Enter to save</span>
          <Button type="button" variant="ghost" onClick={close} className="max-sm:ml-auto">
            Cancel
          </Button>
          <Button type="submit" variant="primary" icon="check">
            Save note
          </Button>
        </footer>
      </form>
    </Modal>
  )
}

// Under a finished item in a list: your note (tap to edit), or a quiet
// "Add a note" when there isn't one yet. Sits outside the card's link.
export function NoteSlot({ item, compact = false, className }) {
  const note = item._review
  if (note) {
    return (
      <button
        type="button"
        onClick={() => openNote(item)}
        aria-label={`Edit your note on ${item.title || 'this'}`}
        title="Edit your note"
        className={cn(
          'group/note relative z-10 flex w-full items-start gap-2 rounded-md text-left text-fg-2 outline-none transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-accent',
          compact ? 'text-xs leading-snug' : 'text-sm leading-relaxed',
          className,
        )}
      >
        <Icon name="quote" className={cn('shrink-0 text-accent', compact ? 'mt-px h-3 w-3' : 'mt-1 h-3.5 w-3.5')} />
        <span className={cn('min-w-0 whitespace-pre-line font-read italic', compact ? 'line-clamp-3' : 'line-clamp-2')}>{note}</span>
        <Icon
          name="pencil"
          className={cn('shrink-0 text-muted opacity-0 transition-opacity group-hover/note:opacity-100 group-focus-visible/note:opacity-100 pointer-coarse:opacity-100', compact ? 'h-3 w-3' : 'mt-1 h-3.5 w-3.5')}
        />
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={() => openNote(item)}
      aria-label={`Add a note on ${item.title || 'this'}`}
      className={cn(
        'relative z-10 inline-flex items-center gap-1.5 rounded-md font-semibold text-muted outline-none transition-colors hover:text-accent focus-visible:ring-2 focus-visible:ring-accent',
        compact ? 'text-xs' : 'text-sm',
        className,
      )}
    >
      <Icon name="pen" className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      Add a note
    </button>
  )
}
