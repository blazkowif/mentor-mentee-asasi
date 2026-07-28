import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import * as taskService from '@/services/taskService'
import type { Database } from '@/types/database.types'

type TaskInsert = Database['public']['Tables']['tasks']['Insert']
type TaskUpdate = Database['public']['Tables']['tasks']['Update']
type SubmissionStatus = Database['public']['Tables']['task_submissions']['Row']['status']

export function useLecturerTasks(lecturerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tasks.byLecturer(lecturerId ?? ''),
    queryFn: () => taskService.listTasksByLecturer(lecturerId!),
    enabled: !!lecturerId,
  })
}

export function useMentorTasks(mentorId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.tasks.byMentor(mentorId ?? ''),
    queryFn: () => taskService.listTasksByMentor(mentorId!),
    enabled: !!mentorId,
  })
}

export function useCreateTask(lecturerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (task: Omit<TaskInsert, 'lecturer_id'>) =>
      taskService.createTask({ ...task, lecturer_id: lecturerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byLecturer(lecturerId) })
    },
  })
}

export function useUpdateTask(lecturerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TaskUpdate }) =>
      taskService.updateTask(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byLecturer(lecturerId) })
    },
  })
}

export function useDeleteTask(lecturerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => taskService.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byLecturer(lecturerId) })
    },
  })
}

export function useTaskSubmissions(taskId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tasks.submissions(taskId ?? ''),
    queryFn: () => taskService.listSubmissionsForTask(taskId!),
    enabled: !!taskId,
  })
}

export function useMySubmission(taskId: string | undefined, studentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tasks.mySubmission(taskId ?? '', studentId ?? ''),
    queryFn: () => taskService.getMySubmission(taskId!, studentId!),
    enabled: !!taskId && !!studentId,
  })
}

export function useSubmitTask(taskId: string, studentId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: string | null) => taskService.submitTask({ taskId, studentId, file }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.mySubmission(taskId, studentId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.submissions(taskId) })
    },
  })
}

export function useReviewSubmission(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
      feedback,
    }: {
      id: string
      status: SubmissionStatus
      feedback?: string
    }) => taskService.reviewSubmission(id, { status, feedback }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.submissions(taskId) })
    },
  })
}
