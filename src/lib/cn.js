import { extendTailwindMerge } from 'tailwind-merge'

// Teach tailwind-merge the design system's custom radius tokens so
// rounded-card / rounded-ui conflict with rounded-full etc. like built-ins.
const twMerge = extendTailwindMerge({
  extend: { theme: { radius: ['card', 'ui'] } },
})

// Class joiner that lets a caller's classes override a component's
// defaults (e.g. <Img className="absolute …"> beats the base "relative").
export function cn(...parts) {
  return twMerge(parts.filter(Boolean).join(' '))
}
