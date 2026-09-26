import { CATEGORY_BY_KEY } from '../../config/categories'
import BookCard from './BookCard'
import GameCard from './GameCard'
import PosterCard from './PosterCard'
import VideoCard from './VideoCard'

// Picks the right card for an item's world. `accent` scopes the world's
// voice (accent colour + display face) onto the card, for mixed contexts like
// Home and Search where the page itself is in the neutral theme.
export default function MediaCard({ item, accent = false, size, ...props }) {
  const shape = CATEGORY_BY_KEY[item.category]?.shape
  let card
  if (shape === 'book') card = <BookCard item={item} size={size} {...props} />
  else if (shape === 'wide') card = <GameCard item={item} size={size === 'fill' ? 'fill' : 'md'} {...props} />
  else if (shape === 'video') card = <VideoCard item={item} {...props} />
  else card = <PosterCard item={item} size={size} {...props} />
  return accent ? (
    <div data-accent={item.category} className="contents">
      {card}
    </div>
  ) : (
    card
  )
}
