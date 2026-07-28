import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import * as announcementService from '@/services/announcementService'
import type { Database } from '@/types/database.types'

type AnnouncementInsert = Database['public']['Tables']['announcements']['Insert']

export function useLecturerAnnouncements(lecturerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.announcements.byLecturer(lecturerId ?? ''),
    queryFn: () => announcementService.listAnnouncementsByLecturer(lecturerId!),
    enabled: !!lecturerId,
  })
}

export function useMentorAnnouncements(mentorId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.announcements.byMentor(mentorId ?? ''),
    queryFn: () => announcementService.listAnnouncementsByMentor(mentorId!),
    enabled: !!mentorId,
  })
}

export function useCreateAnnouncement(lecturerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (announcement: Omit<AnnouncementInsert, 'lecturer_id'>) =>
      announcementService.createAnnouncement({ ...announcement, lecturer_id: lecturerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.byLecturer(lecturerId) })
    },
  })
}

export function useDeleteAnnouncement(lecturerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => announcementService.deleteAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.byLecturer(lecturerId) })
    },
  })
}
