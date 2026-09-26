import { lazy } from 'react'

// Each world ships its own Discover / Library / Detail screens, split into
// separate chunks so opening Movies doesn't download the Games HUD.
export const WORLDS = {
  movie: {
    Discover: lazy(() => import('./movie/Discover')),
    Library: lazy(() => import('./movie/Library')),
    Detail: lazy(() => import('./movie/Detail')),
  },
  tv: {
    Discover: lazy(() => import('./tv/Discover')),
    Library: lazy(() => import('./tv/Library')),
    Detail: lazy(() => import('./tv/Detail')),
  },
  anime: {
    Discover: lazy(() => import('./anime/Discover')),
    Library: lazy(() => import('./anime/Library')),
    Detail: lazy(() => import('./anime/Detail')),
  },
  book: {
    Discover: lazy(() => import('./book/Discover')),
    Library: lazy(() => import('./book/Library')),
    Detail: lazy(() => import('./book/Detail')),
  },
  game: {
    Discover: lazy(() => import('./game/Discover')),
    Library: lazy(() => import('./game/Library')),
    Detail: lazy(() => import('./game/Detail')),
  },
  documentary: {
    Discover: lazy(() => import('./documentary/Discover')),
    Library: lazy(() => import('./documentary/Library')),
    Detail: lazy(() => import('./documentary/Detail')),
  },
  youtube: {
    Discover: lazy(() => import('./youtube/Discover')),
    Library: lazy(() => import('./youtube/Library')),
    Detail: lazy(() => import('./youtube/Detail')),
  },
}
