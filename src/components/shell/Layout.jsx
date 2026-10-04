import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TopBar from './TopBar'
import MobileBar from './MobileBar'
import CommandPalette from './CommandPalette'
import Toaster from '../ui/Toaster'
import { NoteEditorHost } from '../library/NoteEditor'

export default function Layout() {
  const { pathname } = useLocation()
  const [paletteOpen, setPaletteOpen] = useState(false)

  // React Router keeps the window scroll position across navigations, so
  // opening a detail page from deep in a list would land you at the bottom.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  // ⌘K / Ctrl+K anywhere, or "/" when not typing, opens search.
  useEffect(() => {
    function onKey(e) {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    const onOpen = () => setPaletteOpen(true)
    document.addEventListener('keydown', onKey)
    // Other screens (Home's big search field) ask for the palette via event.
    window.addEventListener('vault:search', onOpen)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('vault:search', onOpen)
    }
  }, [])

  return (
    <div className="min-h-full">
      {/* Fixed backdrop: accent glows + each world's signature texture,
          driven by <html data-theme> (see index.css). */}
      <div aria-hidden className="ambient" />
      <a
        href="#main"
        className="sr-only z-[100] rounded-ui bg-accent px-4 py-2 text-on-accent focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <TopBar onSearch={() => setPaletteOpen(true)} />
      <main id="main" className="pb-28 md:pb-16">
        <Outlet />
      </main>
      <MobileBar onSearch={() => setPaletteOpen(true)} />
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
      <NoteEditorHost />
      <Toaster />
    </div>
  )
}
