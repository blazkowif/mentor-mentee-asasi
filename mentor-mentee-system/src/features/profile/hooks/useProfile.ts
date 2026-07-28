import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import * as userService from '@/services/userService'
import { useAuthStore } from '@/features/auth/authStore'
import type { Database } from '@/types/database.types'

type UserRow = Database['public']['Tables']['users']['Row']

export function useUpdateProfile(userId: string) {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)

  return useMutation({
    mutationFn: (patch: Partial<UserRow>) => userService.updateProfile(userId, patch),
    onSuccess: (updated) => {
      setUser(updated)
      queryClient.invalidateQueries({ queryKey: queryKeys.users.profile(userId) })
    },
  })
}
