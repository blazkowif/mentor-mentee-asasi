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
    const unsubscribe = chatService.subscribeToMessages({ userA, userB }, (message) => {
      queryClient.setQueryData(queryKey, (old: typeof query.data) => [...(old ?? []), message])
    })
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
    const unsubscribe = chatService.subscribeToMessages({ groupId }, (message) => {
      queryClient.setQueryData(queryKey, (old: typeof query.data) => [...(old ?? []), message])
    })
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
