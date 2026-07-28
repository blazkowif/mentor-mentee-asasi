import { useState } from 'react'
import { useTaskSubmissions, useReviewSubmission } from '../hooks/useTasks'
import StatusBadge from '@/components/StatusBadge'
import { formatRelative } from '@/utils/formatDate'

export default function SubmissionsPanel({ taskId }: { taskId: string }) {
  const { data: submissions, isLoading } = useTaskSubmissions(taskId)
  const reviewSubmission = useReviewSubmission(taskId)
  const [feedbackDraft, setFeedbackDraft] = useState<Record<string, string>>({})

  if (isLoading) return <p className="text-sm text-gray-500">Loading submissions…</p>
  if (!submissions || submissions.length === 0) {
    return <p className="text-sm text-gray-500">No submissions yet.</p>
  }

  return (
    <div className="space-y-3">
      {submissions.map((s) => (
        <div key={s.id} className="rounded border border-gray-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {s.submitted_at ? formatRelative(s.submitted_at) : 'Not submitted'}
            </span>
            <StatusBadge status={s.status} />
          </div>

          {s.file && (
            <a
              href={s.file}
              target="_blank"
              rel="noreferrer"
              className="mb-2 block text-sm text-ums-blue underline"
            >
              View submitted file
            </a>
          )}

          <textarea
            className="mb-2 w-full rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="Feedback…"
            rows={2}
            value={feedbackDraft[s.id] ?? s.feedback ?? ''}
            onChange={(e) => setFeedbackDraft((d) => ({ ...d, [s.id]: e.target.value }))}
          />

          <div className="flex gap-2">
            <button
              className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200"
              onClick={() =>
                reviewSubmission.mutate({
                  id: s.id,
                  status: 'reviewed',
                  feedback: feedbackDraft[s.id],
                })
              }
            >
              Mark reviewed
            </button>
            <button
              className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
              onClick={() =>
                reviewSubmission.mutate({
                  id: s.id,
                  status: 'completed',
                  feedback: feedbackDraft[s.id],
                })
              }
            >
              Mark completed
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
