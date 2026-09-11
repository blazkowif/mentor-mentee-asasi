import { useEffect } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import * as chatService from '@/services/chatService'
import * as userService from '@/services/userService'

// Reused for building the lecturer's personal-chat conversation list.
export function useMentees(lecturerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.users.mentees(lecturerId ?? ''),
    queryFn: () => userService.getMentees(lecturerId!),
    enabled: !!lecturerId,
  })
}

export function useStaff(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.users.all(),
    queryFn: async () => {
      const users = await userService.listAllUsers()
      return users.filter((candidate) => candidate.role !== 'student')
    },
    enabled,
  })
}

export function useMentor(mentorId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.users.mentor(mentorId ?? ''),
    queryFn: () => userService.getMentor(mentorId!),
    enabled: !!mentorId,
  })
}

export function useMyGroup(lecturerOrMentorId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.chat.myGroup(lecturerOrMentorId ?? ''),
    queryFn: () => chatService.getMyGroup(lecturerOrMentorId!),
    enabled: !!lecturerOrMentorId,
  })
}

export function useMyGroups(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.chat.groups(userId ?? ''),
    queryFn: chatService.listMyGroups,
    enabled: !!userId,
  })
}

export function useStudentSearch(query: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.chat.studentSearch(query),
    queryFn: () => userService.searchChatUsers(query),
    enabled: enabled && query.trim().length >= 2,
  })
}

export function usePersonalMessages(userA: string | undefined, userB: string | undefined) {
  const queryClient = useQueryClient()
  const queryKey = queryKeys.chat.personal(userA ?? '', userB ?? '')

  const query = useQuery({
    queryKey,
    queryFn: () => chatService.listPersonalMessages(userA!, userB!),
    enabled: !!userA && !!userB,
  })

  useEffect(() => {
    if (!userA || !userB) return
    const unsubscribe = chatService.subscribeToMessages(
      { userA, userB },
      (message) => {
        queryClient.setQueryData(queryKey, (old: typeof query.data) => {
          if (old?.some((item) => item.id === message.id)) return old
          return [...(old ?? []), message]
        })
      },
      (messageId) => {
        queryClient.setQueryData(queryKey, (old: typeof query.data) =>
          old?.filter((item) => item.id !== messageId) ?? [],
        )
      },
    )
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userA, userB])

  return query
}

export function useGroupMessages(groupId: string | undefined) {
  const queryClient = useQueryClient()
  const queryKey = queryKeys.chat.group(groupId ?? '')
  const query = useQuery({
    queryKey,
    queryFn: () => chatService.listGroupMessages(groupId!),
    enabled: !!groupId,
  })

  useEffect(() => {
    if (!groupId) return
    const unsubscribe = chatService.subscribeToMessages(
      { groupId },
      (message) => {
        queryClient.setQueryData(queryKey, (old: typeof query.data) => {
          if (old?.some((item) => item.id === message.id)) return old
          return [...(old ?? []), message]
        })
      },
      (messageId) => {
        queryClient.setQueryData(queryKey, (old: typeof query.data) =>
          old?.filter((item) => item.id !== messageId) ?? [],
        )
      },
    )
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  return query
}

export function useSendMessage() {
  return useMutation({
    mutationFn: chatService.sendMessage,
    // No cache invalidation needed — the realtime subscription above appends
    // the new row (including this client's own insert) as it comes back
    // through Postgres changes.
  })
}

export function useDeleteMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: chatService.deleteMessage,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat'] }),
  })
}
