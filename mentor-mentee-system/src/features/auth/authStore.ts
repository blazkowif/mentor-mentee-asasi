import { create } from 'zustand'
import type { Database, UserRole } from '@/types/database.types'

type AppUser = Database['public']['Tables']['users']['Row']

interface AuthState {
  user: AppUser | null
  role: UserRole | null
  isLoading: boolean
  setUser: (user: AppUser | null) => void
  setLoading: (loading: boolean) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  isLoading: true,
  setUser: (user) => set({ user, role: user?.role ?? null }),
  setLoading: (isLoading) => set({ isLoading }),
  clear: () => set({ user: null, role: null }),
}))
