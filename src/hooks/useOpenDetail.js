import { useNavigate } from 'react-router-dom'
import { detailPath } from '../lib/paths'

// Returns a handler that navigates to an item's detail page. Passed to cards
// as their `onOpen` so clicking a poster deep-links instead of opening a modal.
export function useOpenDetail() {
  const navigate = useNavigate()
  return (item) => navigate(detailPath(item))
}
