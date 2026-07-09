import { localLibrary } from './localLibrary'

// Async facade over the localStorage library. The app is local-first: data
// always lives in this browser, and the optional device-sync layer
// (lib/sync.js) mirrors it across devices via a sync code. Kept async and
// keeping the userId params so callers don't care about any of that.

export const libraryStore = {
  async list() {
    return localLibrary.list()
  },

  async upsert(userId, item) {
    return localLibrary.upsert(item)
  },

  async remove(userId, args) {
    return localLibrary.remove(args)
  },
}
