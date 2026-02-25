export const queryKeys = {
  ratings: {
    all: ['ratings'] as const,
    detail: (id: string) => ['ratings', 'detail', id] as const,
    byUser: (userId: string) => ['ratings', 'byUser', userId] as const,
    byProduct: (productId: string) => ['ratings', 'byProduct', productId] as const,
  },
  products: {
    all: ['products'] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
    search: (query: string) => ['products', 'search', query] as const,
  },
  brands: {
    all: ['brands'] as const,
  },
  tags: {
    all: ['tags'] as const,
    byCategory: (categoryId: string | null) => ['tags', 'byCategory', categoryId] as const,
  },
  feed: {
    activity: ['feed', 'activity'] as const,
  },
  profiles: {
    detail: (id: string) => ['profiles', 'detail', id] as const,
    stats: (id: string) => ['profiles', 'stats', id] as const,
    followers: (id: string) => ['profiles', 'followers', id] as const,
    following: (id: string) => ['profiles', 'following', id] as const,
    isFollowing: (userId: string, targetId: string) => ['profiles', 'isFollowing', userId, targetId] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    unreadCount: ['notifications', 'unreadCount'] as const,
  },
  comments: {
    byRating: (ratingId: string) => ['comments', 'byRating', ratingId] as const,
  },
  likes: {
    isLiked: (userId: string, ratingId: string) => ['likes', 'isLiked', userId, ratingId] as const,
  },
} as const;
