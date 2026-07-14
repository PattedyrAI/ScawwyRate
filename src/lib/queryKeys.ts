export const queryKeys = {
  profiles: {
    detail: (id: string) => ['profiles', 'detail', id] as const,
  },
  groups: {
    all: ['groups'] as const,
    detail: (id: string) => ['groups', 'detail', id] as const,
    members: (id: string) => ['groups', 'members', id] as const,
    webhook: (id: string) => ['groups', 'webhook', id] as const,
  },
  categories: {
    all: ['categories'] as const,
  },
  items: {
    list: (groupId: string) => ['items', 'list', groupId] as const,
    detail: (itemId: string) => ['items', 'detail', itemId] as const,
  },
  ratings: {
    feed: (groupId: string) => ['ratings', 'feed', groupId] as const,
    forItem: (itemId: string) => ['ratings', 'item', itemId] as const,
    mine: (itemId: string, userId: string) => ['ratings', 'mine', itemId, userId] as const,
    detail: (ratingId: string) => ['ratings', 'detail', ratingId] as const,
  },
  comments: {
    forRating: (ratingId: string) => ['comments', 'rating', ratingId] as const,
  },
  history: {
    forRating: (ratingId: string) => ['history', 'rating', ratingId] as const,
  },
  stats: {
    leaderboard: (groupId: string) => ['stats', 'leaderboard', groupId] as const,
  },
} as const;
