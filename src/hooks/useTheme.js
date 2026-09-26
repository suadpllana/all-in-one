import { useEffect } from 'react'
import { THEME_BG } from '../config/categories'

// Switch the whole app into a world's theme (palette, type, textures — see
// index.css) and match the browser chrome colour. Every page calls this with
// its world key; non-category pages use 'home'.
export function useTheme(key) {
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = key
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_BG[key] || THEME_BG.home)
  }, [key])
}

export function useDocumentTitle(title) {
  useEffect(() => {
    if (title) document.title = `${title} · Vault`
  }, [title])
}
