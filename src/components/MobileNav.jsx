import GlobalSearch from './GlobalSearch'

// Bottom bar shown below the md breakpoint: holds the global search, while
// the category tabs live in the (scrollable) top navbar.
export default function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 py-3 backdrop-blur md:hidden">
      <GlobalSearch full />
    </nav>
  )
}
