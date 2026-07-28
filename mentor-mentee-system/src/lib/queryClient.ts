import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30s — dashboards/tasks/announcements don't need to refetch aggressively
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
