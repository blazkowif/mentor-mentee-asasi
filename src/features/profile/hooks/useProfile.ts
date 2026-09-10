import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import * as userService from '@/services/userService'
import { useAuthStore } from '@/features/auth/authStore'
import type { ProfilePatch } from '@/services/userService'

export function useUpdateProfile(userId: string) {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)

  return useMutation({
    mutationFn: (patch: ProfilePatch) => userService.updateProfile(userId, patch),
    onSuccess: (updated) => {
      setUser(updated)
      queryClient.invalidateQueries({ queryKey: queryKeys.users.profile(userId) })
    },
  })
}
