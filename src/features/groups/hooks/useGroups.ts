import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import * as groupsService from '../groups.service';

export function useMyGroups() {
  return useQuery({
    queryKey: queryKeys.groups.all,
    queryFn: groupsService.listMyGroups,
  });
}

export function useGroup(groupId: string) {
  return useQuery({
    queryKey: queryKeys.groups.detail(groupId),
    queryFn: () => groupsService.getGroup(groupId),
    enabled: !!groupId,
  });
}

export function useGroupMembers(groupId: string) {
  return useQuery({
    queryKey: queryKeys.groups.members(groupId),
    queryFn: () => groupsService.listGroupMembers(groupId),
    enabled: !!groupId,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => groupsService.createGroup(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });
}

export function useJoinGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => groupsService.joinGroup(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });
}

export function useUpdateGroup(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: { name?: string }) => groupsService.updateGroup(groupId, updates),
    onSuccess: (group) => {
      queryClient.setQueryData(queryKeys.groups.detail(groupId), group);
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });
}

/** Owner-only: the group's Discord webhook URL (null when unset or not owner). */
export function useGroupWebhook(groupId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.groups.webhook(groupId),
    queryFn: () => groupsService.getGroupWebhook(groupId),
    enabled: !!groupId && enabled,
  });
}

export function useSetGroupWebhook(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (url: string | null) => groupsService.setGroupWebhook(groupId, url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.webhook(groupId) });
    },
  });
}

export function useLeaveGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      groupsService.removeMembership(groupId, userId),
    onSuccess: (_data, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      queryClient.removeQueries({ queryKey: queryKeys.groups.detail(groupId) });
      queryClient.removeQueries({ queryKey: queryKeys.groups.members(groupId) });
    },
  });
}

export function useRemoveMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => groupsService.removeMembership(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.members(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => groupsService.deleteGroup(groupId),
    onSuccess: (_data, groupId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      queryClient.removeQueries({ queryKey: queryKeys.groups.detail(groupId) });
      queryClient.removeQueries({ queryKey: queryKeys.groups.members(groupId) });
    },
  });
}
