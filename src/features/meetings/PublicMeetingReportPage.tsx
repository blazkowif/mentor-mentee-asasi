import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import * as meetingService from '@/services/meetingService'
import { formatDate } from '@/utils/formatDate'

export default function PublicMeetingReportPage() {
  const { token = '' } = useParams()
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ['public-meeting-report', token],
    queryFn: () => meetingService.getPublicMeetingReport(token),
    enabled: !!token,
  })
  const [overallSummary, setOverallSummary] = useState('')
  const [comments, setComments] = useState<Record<string, string>>({})
  const [attention, setAttention] = useState<Record<string, boolean>>({})
  const [remarks, setRemarks] = useState<Record<string, string>>({})
  const save = useMutation({
    mutationFn: (shouldSubmit: boolean) => meetingService.savePublicMeetingReport({
      reportToken: token,
      overallSummary: overallSummary.trim(),
      studentReports: rows.map((row) => ({
        assignment_id: row.assignment_id,
        student_comment: comments[row.assignment_id] ?? row.student_comment,
        needs_attention: attention[row.assignment_id] ?? row.needs_attention,
        attention_remark: (remarks[row.assignment_id] ?? row.attention_remark ?? '').trim() || null,
      })),
      submit: shouldSubmit,
    }),
  })
  const meeting = rows[0]
  const initialSummary = meeting?.overall_summary ?? ''

  if (isLoading) return <main className="min-h-screen bg-ums-gray-light p-6 text-sm text-gray-500">Loading meeting report…</main>
  if (isError || !meeting) return <main className="min-h-screen bg-ums-gray-light p-6"><section className="mx-auto max-w-3xl rounded-lg bg-white p-6 shadow-sm"><h1 className="text-xl font-semibold text-gray-900">Meeting report unavailable</h1><p className="mt-2 text-sm text-gray-600">This report link is invalid or no students have been assigned to the meeting yet.</p></section></main>

  return (
    <main className="min-h-screen bg-ums-gray-light p-4 sm:p-8">
      <section className="mx-auto max-w-4xl space-y-5">
        <header className="rounded-lg bg-ums-blue p-6 text-white shadow-sm">
          <p className="text-sm opacity-80">PPST Mentor-Mentee System</p>
          <h1 className="mt-1 text-2xl font-semibold">Meeting {meeting.meeting_number}: {meeting.title}</h1>
          <p className="mt-2 text-sm opacity-90">Meeting report for {meeting.mentor_name}{meeting.scheduled_start ? ` · ${formatDate(meeting.scheduled_start)}${meeting.scheduled_end ? ` – ${formatDate(meeting.scheduled_end)}` : ''}` : ''}</p>
          {meeting.instructions && <p className="mt-3 rounded bg-white/10 p-3 text-sm">{meeting.instructions}</p>}
        </header>
        <section className="rounded-lg bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900">Overall meeting summary</h2>
          <textarea rows={5} defaultValue={initialSummary} disabled={meeting.is_submitted} onChange={(event) => setOverallSummary(event.target.value)} placeholder="Summarise the overall meeting…" className="mt-3 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-500" />
        </section>
        <section className="space-y-3">
          <h2 className="font-semibold text-gray-900">Students</h2>
          {rows.map((row) => (
            <article key={row.assignment_id} className="rounded-lg bg-white p-5 shadow-sm">
              <h3 className="font-medium text-gray-900">{row.student_name}</h3>
              <textarea rows={3} defaultValue={row.student_comment} disabled={meeting.is_submitted} onChange={(event) => setComments((current) => ({ ...current, [row.assignment_id]: event.target.value }))} placeholder="Comment about this student…" className="mt-3 w-full rounded border px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-500" />
              <label className="mt-3 flex items-center gap-2 text-sm font-medium text-red-700"><input type="checkbox" disabled={meeting.is_submitted} checked={attention[row.assignment_id] ?? row.needs_attention} onChange={(event) => setAttention((current) => ({ ...current, [row.assignment_id]: event.target.checked }))} /> Needs special attention</label>
              {(attention[row.assignment_id] ?? row.needs_attention) && <textarea rows={2} defaultValue={row.attention_remark ?? ''} onChange={(event) => setRemarks((current) => ({ ...current, [row.assignment_id]: event.target.value }))} placeholder="Explain what attention is needed…" className="mt-2 w-full rounded border border-red-200 px-3 py-2 text-sm" />}
            </article>
          ))}
        </section>
        <div className="flex items-center justify-between gap-3">
          {save.isSuccess && <p className="text-sm text-green-700">Meeting report saved.</p>}
          {save.isError && <p className="text-sm text-red-700">{save.error instanceof Error ? save.error.message : 'Unable to save report.'}</p>}
          {!meeting.is_submitted && <div className="ml-auto flex gap-2"><button type="button" disabled={save.isPending || !(overallSummary.trim() || initialSummary.trim())} onClick={() => save.mutate(false)} className="rounded border border-ums-blue px-5 py-2 text-sm font-medium text-ums-blue disabled:opacity-50">Save draft</button><button type="button" disabled={save.isPending || !(overallSummary.trim() || initialSummary.trim())} onClick={() => save.mutate(true)} className="rounded bg-ums-blue px-5 py-2 text-sm font-medium text-white disabled:opacity-50">Submit to admin</button></div>}
        </div>
      </section>
    </main>
  )
}
