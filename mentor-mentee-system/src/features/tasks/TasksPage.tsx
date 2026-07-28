import { useState } from 'react'
import { useAuthStore } from '@/features/auth/authStore'
import { useLecturerTasks, useMentorTasks, useCreateTask } from './hooks/useTasks'
import TaskForm from './components/TaskForm'
import LecturerTaskItem from './components/LecturerTaskItem'
import StudentTaskItem from './components/StudentTaskItem'

// Task list/detail/submission flow (PRD §11).
export default function TasksPage() {
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const [showForm, setShowForm] = useState(false)

  if (!user) return null

  if (role === 'lecturer') {
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
              + New task
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
      </div>
    )
  }

  // Student view. (Admins have no mentor_id, so this renders empty for them —
  // swap in an admin task-overview page later if needed.)
  const { data: tasks, isLoading } = useMentorTasks(user.mentor_id)

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
