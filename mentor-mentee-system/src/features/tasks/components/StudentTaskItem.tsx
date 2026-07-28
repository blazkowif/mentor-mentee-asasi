import { useRef, useState } from 'react'
import type { Database } from '@/types/database.types'
import { useMySubmission, useSubmitTask } from '../hooks/useTasks'
import PriorityBadge from '@/components/PriorityBadge'
import StatusBadge from '@/components/StatusBadge'
import { formatDate } from '@/utils/formatDate'
import { uploadFile } from '@/services/storageService'

type Task = Database['public']['Tables']['tasks']['Row']

export default function StudentTaskItem({ task, studentId }: { task: Task; studentId: string }) {
  const { data: submission } = useMySubmission(task.id, studentId)
  const submitTask = useSubmitTask(task.id, studentId)
  const fileInput = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const isPastDue = task.due_date ? new Date(task.due_date) < new Date() : false
  const canEdit = !submission || submission.status === 'pending' || submission.status === 'submitted'

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      const path = `${task.id}/${studentId}/${file.name}`
      await uploadFile('submissions', path, file)
      submitTask.mutate(path)
    } finally {
      setIsUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-start justify-between gap-2">
        <h3 className="font-medium text-gray-900">{task.title}</h3>
        <PriorityBadge priority={task.priority} />
      </div>
      {task.description && <p className="mb-2 text-sm text-gray-600">{task.description}</p>}
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
        {task.due_date && (
          <span className={isPastDue ? 'font-medium text-red-600' : ''}>
            Due {formatDate(task.due_date)}
          </span>
        )}
        {submission && <StatusBadge status={submission.status} />}
      </div>

      {canEdit ? (
        <div>
          <input
            ref={fileInput}
            type="file"
            className="hidden"
            onChange={handleFileChosen}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
          />
          <button
            onClick={() => fileInput.current?.click()}
            disabled={isUploading}
            className="rounded bg-ums-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-ums-blue-light disabled:opacity-60"
          >
            {isUploading ? 'Uploading…' : submission ? 'Replace submission' : 'Submit file'}
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          {submission?.feedback ? `Feedback: ${submission.feedback}` : 'Awaiting review.'}
        </p>
      )}
    </div>
  )
}
