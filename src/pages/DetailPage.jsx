import { Suspense } from 'react'
import { CATEGORY_BY_KEY } from '../config/categories'
import { useTheme } from '../hooks/useTheme'
import { WORLDS } from '../worlds'
import { DetailSkeleton } from '../worlds/shared/Detail'

// /{world}/{id} — each world renders its own detail layout.
export default function DetailPage({ categoryKey }) {
  useTheme(categoryKey)
  const World = WORLDS[categoryKey]
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <World.Detail category={CATEGORY_BY_KEY[categoryKey]} />
    </Suspense>
  )
}
