import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import * as notificationService from '@/services/notificationService'

export function useNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.notifications.byUser(userId ?? ''),
    queryFn: () => notificationService.listNotifications(userId!),
    enabled: !!userId,
  })
}

export function useMarkNotificationRead(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.byUser(userId) })
    },
  })
}

export function useMarkAllNotificationsRead(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.byUser(userId) })
    },
  })
}
