import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import MobileNav from './MobileNav'

export default function Layout() {
  const { pathname } = useLocation()

  // React Router keeps the window scroll position across navigations, so
  // opening a detail page from deep in a list would land you at the bottom.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="min-h-full">
      {/* Fixed background layer — accent glows + per-category signature
          pattern, driven by <html data-category> (see index.css). */}
      <div aria-hidden className="app-ambient" />
      <Navbar />
      <main className="mx-auto max-w-[1400px] px-4 pb-28 pt-4 md:px-8 md:pb-12">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  )
}
