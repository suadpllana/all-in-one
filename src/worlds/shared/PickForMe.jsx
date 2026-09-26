import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { detailPath } from '../../lib/paths'
import { Button } from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Img from '../../components/ui/Img'
import Modal from '../../components/ui/Modal'

// "Can't decide?" — spins through your list and lands on one. Works for any
// world; `wide` switches the artwork to 16:9 (games, videos).
export default function PickForMe({ items, label = 'Pick for me', heading = 'Tonight’s pick', wide = false, describe, className }) {
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState({ item: null, done: false })
  const timers = useRef([])

  const clear = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }
  useEffect(() => clear, [])

  function roll() {
    if (!items.length) return
    clear()
    const rand = () => items[Math.floor(Math.random() * items.length)]
    const seq = Array.from({ length: Math.min(14, items.length * 3) }, rand)
    seq.push(rand())
    let t = 0
    seq.forEach((item, i) => {
      // Decelerate like a slot reel.
      t += 70 + Math.max(0, i - seq.length + 6) * 55
      timers.current.push(setTimeout(() => setShown({ item, done: i === seq.length - 1 }), t))
    })
  }

  const pick = shown.item
  return (
    <>
      <Button
        variant="grad"
        size="md"
        icon="dice"
        disabled={!items.length}
        onClick={() => {
          setOpen(true)
          roll()
        }}
        className={className}
      >
        {label}
      </Button>
      <Modal
        open={open}
        onClose={() => {
          clear()
          setOpen(false)
        }}
        label={heading}
        className="w-[min(92vw,440px)]"
      >
        <div className="overflow-hidden rounded-3xl bg-surface p-6 text-center shadow-2xl ring-1 ring-line">
          <p className="kicker text-accent">{heading}</p>
          <div className={cn('relative mx-auto mt-5 overflow-hidden rounded-card bg-surface-2 shadow-2xl ring-1 ring-line', wide ? 'aspect-video w-full' : 'aspect-[2/3] w-48')}>
            {pick && (
              <Img
                key={pick.externalId}
                src={wide ? pick.backdropUrl || pick.posterUrl : pick.posterUrl}
                title={pick.title}
                eager
                className={cn('absolute inset-0', !shown.done && 'blur-[1px]')}
              />
            )}
            {!shown.done && (
              <div className="absolute inset-0 grid place-items-center bg-black/25">
                <Icon name="dice" className="h-10 w-10 text-white" style={{ animation: 'shuffle .3s ease-in-out infinite' }} />
              </div>
            )}
          </div>
          <h3 className={cn('mt-5 font-display text-3xl leading-tight text-fg transition-opacity', shown.done ? 'opacity-100' : 'opacity-40')}>
            {pick?.title || '…'}
          </h3>
          {pick && shown.done && describe && <p className="mt-1.5 text-sm text-muted">{describe(pick)}</p>}
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="surface" icon="refresh" onClick={roll} disabled={!shown.done}>
              Again
            </Button>
            {pick && shown.done && (
              <Button as={Link} to={detailPath(pick)} variant="primary" iconRight="arrowRight" onClick={() => setOpen(false)}>
                Let’s go
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </>
  )
}
