// Tiny classnames helper (no dependency).
export function cn(...parts) {
  return parts.filter(Boolean).join(' ')
}
