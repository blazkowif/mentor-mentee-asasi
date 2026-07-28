import { useState } from 'react'
import type { Database } from '@/types/database.types'
import PriorityBadge from '@/components/PriorityBadge'
import { formatDate } from '@/utils/formatDate'
import SubmissionsPanel from './SubmissionsPanel'
import { useDeleteTask } from '../hooks/useTasks'

type Task = Database['public']['Tables']['tasks']['Row']

export default function LecturerTaskItem({ task }: { task: Task }) {
  const [expanded, setExpanded] = useState(false)
  const deleteTask = useDeleteTask(task.lecturer_id)

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-start justify-between gap-2">
        <h3 className="font-medium text-gray-900">{task.title}</h3>
        <PriorityBadge priority={task.priority} />
      </div>
      {task.description && <p className="mb-2 text-sm text-gray-600">{task.description}</p>}
      <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
        <span>{task.due_date ? `Due ${formatDate(task.due_date)}` : 'No due date'}</span>
        <div className="flex gap-3">
          <button className="text-ums-blue hover:underline" onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Hide submissions' : 'View submissions'}
          </button>
          <button
            className="text-red-600 hover:underline"
            onClick={() => {
              if (confirm('Delete this task?')) deleteTask.mutate(task.id)
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {expanded && <SubmissionsPanel taskId={task.id} />}
    </div>
  )
}
