import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/authStore'
import { useMentees } from '@/features/chat/hooks/useChat'
import * as meetingService from '@/services/meetingService'
import { queryKeys } from '@/lib/queryKeys'
import { formatDate } from '@/utils/formatDate'

export default function MeetingPanel() {
  const user = useAuthStore((state) => state.user)
  const role = useAuthStore((state) => state.role)
  const queryClient = useQueryClient()
  const { data: mentees = [] } = useMentees(role === 'lecturer' ? user?.id : undefined)
  const { data: meetingTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: queryKeys.meetings.tasks(),
    queryFn: meetingService.listMeetingTasks,
  })
  const { data: assignments = [] } = useQuery({
    queryKey: queryKeys.meetings.assignments(role === 'lecturer' ? user?.id : user?.id),
    queryFn: () => role === 'lecturer'
      ? meetingService.listAssignments(user?.id)
      : role === 'student'
      ? meetingService.listAssignments(undefined, user?.id)
      : meetingService.listAssignments(),
    enabled: !!user,
  })
  const { data: reports = [] } = useQuery({
    queryKey: queryKeys.meetings.reports(),
    queryFn: meetingService.listReports,
    enabled: role === 'admin',
  })
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [scheduledStart, setScheduledStart] = useState('')
  const [scheduledEnd, setScheduledEnd] = useState('')
  const [selectedTask, setSelectedTask] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')
  const [summary, setSummary] = useState<Record<string, string>>({})
  const [remark, setRemark] = useState<Record<string, string>>({})
  const [attention, setAttention] = useState<Record<string, boolean>>({})
  const [message, setMessage] = useState<string | null>(null)

  const taskMap = useMemo(() => new Map(meetingTasks.map((task) => [task.id, task])), [meetingTasks])
  const assignmentKeys = useMemo(() => new Set(assignments.map((assignment) => `${assignment.meeting_task_id}:${assignment.student_id}`)), [assignments])
  const nextMeetingNumber = meetingService.nextMeetingNumber(meetingTasks)

  const create = useMutation({
    mutationFn: () => meetingService.createMeetingTask({
      created_by: user!.id,
      meeting_number: nextMeetingNumber,
      title: title.trim() || `Mentor-Mentee Meeting ${nextMeetingNumber}`,
      instructions: instructions.trim() || null,
      scheduled_start: scheduledStart || null,
      scheduled_end: scheduledEnd || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meetings.tasks() })
      setInstructions('')
      setScheduledStart('')
      setScheduledEnd('')
      setTitle('')
      setMessage('Meeting task created for mentors.')
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Unable to create meeting task.'),
  })
  const assign = useMutation({
    mutationFn: () => meetingService.assignStudent({ meetingTaskId: selectedTask, mentorId: user!.id, studentId: selectedStudent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meetings.assignments(user!.id) })
      setSelectedStudent('')
      setMessage('Student assigned to the meeting.')
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Unable to assign student.'),
  })
  const report = useMutation({
    mutationFn: (assignmentId: string) => meetingService.saveReport({
      assignmentId,
      mentorId: user!.id,
      studentId: assignments.find((assignment) => assignment.id === assignmentId)!.student_id,
      overallSummary: summary[assignmentId]?.trim() ?? '',
      needsAttention: attention[assignmentId] ?? false,
      attentionRemark: remark[assignmentId]?.trim() || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meetings.reports() })
      setMessage('Meeting report saved.')
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Unable to save meeting report.'),
  })

  if (!user) return null
  return (
    <div className="space-y-5">
      {message && <p className="rounded bg-blue-50 px-3 py-2 text-sm text-blue-800">{message}</p>}
      {role === 'admin' && (
        <section className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-1 font-semibold text-gray-900">Create meeting task</h2>
          <p className="mb-4 text-sm text-gray-500">Mentors will see this meeting and assign their own mentees.</p>
          <div className="rounded border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
            <p className="font-medium">Meeting number: {nextMeetingNumber}</p>
            <p className="text-xs text-blue-700">The meeting number is assigned automatically. You may edit the formal title below.</p>
          </div>
          <label className="mt-3 block text-sm">Formal title
            <input required value={title || `Mentor-Mentee Meeting ${nextMeetingNumber}`} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
          </label>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-sm">Meeting period starts
              <input type="date" value={scheduledStart} onChange={(event) => setScheduledStart(event.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
            </label>
            <label className="text-sm">Meeting period ends
              <input type="date" min={scheduledStart || undefined} value={scheduledEnd} onChange={(event) => setScheduledEnd(event.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
            </label>
          </div>
          <label className="mt-3 block text-sm">Instructions
            <textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} rows={3} className="mt-1 w-full rounded border px-3 py-2" />
          </label>
          <button type="button" disabled={create.isPending || (!!scheduledStart && !!scheduledEnd && scheduledEnd < scheduledStart)} onClick={() => create.mutate()} className="mt-3 rounded bg-ums-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {create.isPending ? 'Creating…' : 'Create meeting task'}
          </button>
          <div className="mt-5 space-y-2">
            {tasksLoading ? <p className="text-sm text-gray-500">Loading meetings…</p> : meetingTasks.map((task) => (
              <div key={task.id} className="rounded border p-3 text-sm">
                <p className="font-medium">Meeting {task.meeting_number}: {task.title}</p>
                <p className="text-xs text-gray-500">{task.scheduled_start ? `${formatDate(task.scheduled_start)}${task.scheduled_end ? ` – ${formatDate(task.scheduled_end)}` : ''}` : 'Date range not set'} · {reports.filter((reportItem) => taskMap.get(task.id) && assignments.some((a) => a.meeting_task_id === task.id && a.id === reportItem.meeting_assignment_id)).length} reports received</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {role === 'lecturer' && (
        <>
          <section className="rounded-lg bg-white p-4 shadow-sm">
            <h2 className="mb-1 font-semibold text-gray-900">Assign a meeting to a mentee</h2>
            <p className="mb-3 text-sm text-gray-500">Choose an administrator-created meeting and one of your assigned students.</p>
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <select value={selectedTask} onChange={(event) => setSelectedTask(event.target.value)} className="rounded border px-3 py-2 text-sm">
                <option value="">Select meeting</option>
                {meetingTasks.map((task) => <option key={task.id} value={task.id}>Meeting {task.meeting_number}: {task.title}</option>)}
              </select>
              <select value={selectedStudent} onChange={(event) => setSelectedStudent(event.target.value)} className="rounded border px-3 py-2 text-sm">
                <option value="">Select mentee</option>
                {mentees.map((mentee) => <option key={mentee.id} value={mentee.id}>{mentee.name}</option>)}
              </select>
              <button type="button" disabled={assign.isPending || !selectedTask || !selectedStudent || assignmentKeys.has(`${selectedTask}:${selectedStudent}`)} onClick={() => assign.mutate()} className="rounded bg-ums-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                Assign
              </button>
            </div>
          </section>
          <section className="space-y-3">
            <h2 className="font-semibold text-gray-900">Meeting reports</h2>
            {assignments.length === 0 && <p className="text-sm text-gray-500">No meeting assignments yet.</p>}
            {assignments.map((assignment) => {
              const task = taskMap.get(assignment.meeting_task_id)
              return (
                <div key={assignment.id} className="rounded-lg bg-white p-4 shadow-sm">
                  <p className="font-medium">Meeting {task?.meeting_number ?? '—'} · {mentees.find((mentee) => mentee.id === assignment.student_id)?.name ?? 'Student'}</p>
                  <textarea rows={3} value={summary[assignment.id] ?? ''} onChange={(event) => setSummary((current) => ({ ...current, [assignment.id]: event.target.value }))} placeholder="Overall summary of the meeting" className="mt-3 w-full rounded border px-3 py-2 text-sm" />
                  <label className="mt-2 flex items-center gap-2 text-sm font-medium text-red-700"><input type="checkbox" checked={attention[assignment.id] ?? false} onChange={(event) => setAttention((current) => ({ ...current, [assignment.id]: event.target.checked }))} /> Student needs immediate attention</label>
                  {attention[assignment.id] && <textarea rows={2} value={remark[assignment.id] ?? ''} onChange={(event) => setRemark((current) => ({ ...current, [assignment.id]: event.target.value }))} placeholder="Explain the immediate-attention concern" className="mt-2 w-full rounded border border-red-200 px-3 py-2 text-sm" />}
                  <button type="button" disabled={report.isPending || !(summary[assignment.id] ?? '').trim() || (attention[assignment.id] && !(remark[assignment.id] ?? '').trim())} onClick={() => report.mutate(assignment.id)} className="mt-3 rounded bg-ums-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Save meeting report</button>
                </div>
              )
            })}
          </section>
        </>
      )}
      {role === 'student' && (
        <section className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-1 font-semibold text-gray-900">Assigned mentor meetings</h2>
          <p className="mb-3 text-sm text-gray-500">Your mentor will discuss the meeting with you and record the official summary.</p>
          <div className="space-y-2">
            {assignments.length === 0 && <p className="text-sm text-gray-500">No meeting has been assigned to you yet.</p>}
            {assignments.map((assignment) => {
              const task = taskMap.get(assignment.meeting_task_id)
              return <div key={assignment.id} className="rounded border p-3 text-sm"><p className="font-medium">Meeting {task?.meeting_number ?? '—'}: {task?.title ?? 'Meeting task'}</p><p className="text-xs text-gray-500">{task?.scheduled_start ? `${formatDate(task.scheduled_start)}${task.scheduled_end ? ` – ${formatDate(task.scheduled_end)}` : ''}` : 'Date range not set'}</p>{task?.instructions && <p className="mt-2 text-gray-600">{task.instructions}</p>}</div>
            })}
          </div>
        </section>
      )}
    </div>
  )
}
