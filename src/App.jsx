import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import Layout from './components/shell/Layout'
import HomePage from './pages/HomePage'
import CategoryPage from './pages/CategoryPage'
import DetailPage from './pages/DetailPage'
import SearchPage from './pages/SearchPage'
import StatsPage from './pages/StatsPage'
import AccountPage from './pages/AccountPage'
import AuthPage from './pages/AuthPage'
import { CATEGORIES } from './config/categories'
import { VIEW_SEGMENTS } from './lib/paths'

// The /{world}/:segment slot is shared: a library tab (plan/progress/done)
// or an item id. Dispatch accordingly so both /anime/done and /anime/54321
// resolve from the same clean URL shape.
function CategorySegment({ categoryKey }) {
  const { segment } = useParams()
  if (VIEW_SEGMENTS.includes(segment)) {
    return <CategoryPage categoryKey={categoryKey} />
  }
  return <DetailPage categoryKey={categoryKey} />
}

const App = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        {CATEGORIES.map((c) => (
          <Route key={c.key} path={c.route}>
            <Route index element={<CategoryPage categoryKey={c.key} />} />
            <Route path=":segment" element={<CategorySegment categoryKey={c.key} />} />
          </Route>
        ))}
        <Route path="/search" element={<SearchPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
