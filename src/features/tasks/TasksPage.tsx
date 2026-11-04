import { useEffect, useState } from 'react'
import { useAuthStore } from '@/features/auth/authStore'
import { useMentees } from '@/features/chat/hooks/useChat'
import { useLecturerTasks, useMentorTasks, useCreateTask } from './hooks/useTasks'
import TaskForm from './components/TaskForm'
import { useQuery } from '@tanstack/react-query'
import * as adminService from '@/services/adminService'
import LecturerTaskItem from './components/LecturerTaskItem'
import StudentTaskItem from './components/StudentTaskItem'
import MeetingPanel from '@/features/meetings/MeetingPanel'
import * as notificationService from '@/services/notificationService'

// Task list/detail/submission flow (PRD §11).
export default function TasksPage() {
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  useEffect(() => {
    if (!user) return
    notificationService.markTitlesAsRead(user.id, ['New task assigned'])
      .catch(() => undefined)
  }, [user])
  const [showForm, setShowForm] = useState(false)
  const { data: mentees = [] } = useMentees(role === 'lecturer' ? user?.id : undefined)
  const usersQuery = useQuery({ queryKey: ['users', 'content-targets'], queryFn: adminService.listAllUsers, enabled: role === 'admin' })

  if (!user) return null

  if (role === 'lecturer' || role === 'admin') {
    const { data: tasks, isLoading } = useLecturerTasks(user.id)
    const createTask = useCreateTask(user.id)

    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Tasks</h1>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="rounded bg-ums-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-ums-blue-light"
            >
              + Add task
            </button>
          )}
        </div>

        {showForm && (
          <TaskForm
            isSubmitting={createTask.isPending}
            onCancel={() => setShowForm(false)}
            onSubmit={(values) =>
              createTask.mutate(values, { onSuccess: () => setShowForm(false) })
            }
            audienceOptions={role === 'admin'
              ? [{ value: 'student', label: 'Students' }, { value: 'lecturer', label: 'Mentors / teachers' }, { value: 'all', label: 'Everyone' }]
              : role === 'lecturer'
              ? [{ value: 'student', label: 'Students' }]
              : undefined}
            studentOptions={role === 'lecturer'
              ? mentees.map((mentee) => ({ id: mentee.id, name: mentee.name }))
              : usersQuery.data?.filter((candidate) => candidate.role === 'student').map((candidate) => ({ id: candidate.id, name: candidate.name })) ?? []}
          />
        )}

        {isLoading && <p className="text-sm text-gray-500">Loading tasks…</p>}
        <div className="space-y-3">
          {tasks?.map((task) => (
            <LecturerTaskItem key={task.id} task={task} />
          ))}
          {tasks?.length === 0 && (
            <p className="text-sm text-gray-500">No tasks yet — create one to get started.</p>
          )}
        </div>
        <div className="mt-8 border-t border-gray-200 pt-6">
          <MeetingPanel />
        </div>
      </div>
    )
  }

  // Student view. (Admins have no mentor_id, so this renders empty for them —
  // swap in an admin task-overview page later if needed.)
  const { data: tasks, isLoading } = useMentorTasks(user.mentor_id, user.id)

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-gray-900">Tasks</h1>
      {isLoading && <p className="text-sm text-gray-500">Loading tasks…</p>}
      <div className="space-y-3">
        {tasks?.map((task) => (
          <StudentTaskItem key={task.id} task={task} studentId={user.id} />
        ))}
        {tasks?.length === 0 && <p className="text-sm text-gray-500">No tasks assigned yet.</p>}
      </div>
    </div>
  )
}
