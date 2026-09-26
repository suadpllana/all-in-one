import { useParams } from 'react-router-dom'
import { useDetail } from '../../hooks/useDiscover'
import { useDocumentTitle, useTheme } from '../../hooks/useTheme'

// Shared plumbing for a world's detail page: the id from the URL, the world
// theme (also when deep-linked), the detail query and the document title.
export function useDetailPage(categoryKey) {
  // React Router already decodes the segment ("ol%3AOL1W" -> "ol:OL1W").
  const { segment: id } = useParams()
  useTheme(categoryKey)
  const query = useDetail(categoryKey, id)
  useDocumentTitle(query.data?.title)
  return { id, ...query }
}
