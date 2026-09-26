import { cn } from '../../lib/cn'

// Vault mark: a vault dial whose rim carries every world's colour.
export default function Logo({ className }) {
  return (
    <span
      aria-hidden
      className={cn('relative grid h-9 w-9 shrink-0 place-items-center rounded-[11px] shadow-lg', className)}
      style={{
        background:
          'conic-gradient(from 210deg, #e5383b, #f2c14e, #b6f23a, #25e0c1, #3b82f6, #8f7cff, #ff5c9d, #e5383b)',
      }}
    >
      <span className="absolute inset-[3px] rounded-[9px] bg-[#0c0c12]" />
      <span className="relative grid h-[19px] w-[19px] place-items-center rounded-full ring-2 ring-white/85">
        <span className="h-[7px] w-[3px] translate-y-[1px] rounded-full bg-white/90" />
      </span>
    </span>
  )
}
