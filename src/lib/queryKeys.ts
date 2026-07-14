export const queryKeys = {
  profiles: {
    detail: (id: string) => ['profiles', 'detail', id] as const,
  },
  groups: {
    all: ['groups'] as const,
    detail: (id: string) => ['groups', 'detail', id] as const,
    members: (id: string) => ['groups', 'members', id] as const,
  },
} as const;
