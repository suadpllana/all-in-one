import { Suspense } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { CATEGORY_BY_KEY, getSubmenu } from '../config/categories'
import { useDocumentTitle, useTheme } from '../hooks/useTheme'
import CategoryBar from '../components/shell/CategoryBar'
import { GridSkeleton, HeroSkeleton } from '../components/ui/Skeleton'
import { WORLDS } from '../worlds'
import WorldSearch from '../worlds/shared/WorldSearch'

// A world's landing (Discover) or one of its library tabs. The world bar
// sits on top; the body is entirely the world's own screen.
export default function CategoryPage({ categoryKey }) {
  const category = CATEGORY_BY_KEY[categoryKey]
  const { segment } = useParams()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') || ''
  useTheme(categoryKey)

  const tabs = getSubmenu(category)
  const tab = tabs.find((t) => t.key === (segment || 'discover')) || tabs[0]
  const isDiscover = tab.key === 'discover'
  const searching = isDiscover && query.trim().length > 0
  useDocumentTitle(isDiscover ? category.label : `${tab.label} · ${category.label}`)

  const setQuery = (v) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (v) p.set('q', v)
        else p.delete('q')
        return p
      },
      { replace: true },
    )

  const World = WORLDS[categoryKey]
  return (
    <div key={categoryKey}>
      <CategoryBar
        category={category}
        tabKey={tab.key}
        query={query}
        onQuery={setQuery}
        overlay={isDiscover && !searching && !params.get('genre')}
      />
      <Suspense fallback={isDiscover ? <HeroSkeleton className="under-bars" /> : <div className="shell py-10"><GridSkeleton shape={category.shape} /></div>}>
        {searching ? (
          <WorldSearch category={category} query={query} />
        ) : isDiscover ? (
          <World.Discover category={category} />
        ) : (
          <World.Library category={category} tab={tab} query={query} />
        )}
      </Suspense>
    </div>
  )
}
