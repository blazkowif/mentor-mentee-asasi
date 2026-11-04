import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/authStore'
import { useMentees } from '@/features/chat/hooks/useChat'
import * as meetingService from '@/services/meetingService'
import * as adminService from '@/services/adminService'
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
  const { data: users = [] } = useQuery({
    queryKey: ['users', 'meeting-assignment'],
    queryFn: adminService.listAllUsers,
    enabled: role === 'admin',
  })
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [scheduledStart, setScheduledStart] = useState('')
  const [scheduledEnd, setScheduledEnd] = useState('')
  const [selectedTask, setSelectedTask] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [selectedMentor, setSelectedMentor] = useState('')
  const [overallByTask, setOverallByTask] = useState<Record<string, string>>({})
  const [studentComments, setStudentComments] = useState<Record<string, string>>({})
  const [studentAttention, setStudentAttention] = useState<Record<string, boolean>>({})
  const [studentRemarks, setStudentRemarks] = useState<Record<string, string>>({})

  const taskMap = useMemo(() => new Map(meetingTasks.map((task) => [task.id, task])), [meetingTasks])
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
  const assignMeeting = useMutation({
    mutationFn: () => meetingService.assignMeetingToMentor(selectedTask, selectedMentor),
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meetings.assignments() })
      setMessage(`Meeting assigned to mentor. ${count} student${count === 1 ? '' : 's'} added and a chat message sent.`)
      setSelectedMentor('')
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Unable to assign meeting.'),
  })
  const saveMeetingReport = useMutation({
    mutationFn: (taskId: string) => {
      const taskAssignments = assignments.filter((assignment) => assignment.meeting_task_id === taskId)
      return meetingService.savePublicMeetingReport({
        reportToken: taskMap.get(taskId)!.report_token,
        overallSummary: overallByTask[taskId]?.trim() ?? '',
        studentReports: taskAssignments.map((assignment) => ({
          assignment_id: assignment.id,
          student_comment: studentComments[assignment.id]?.trim() ?? '',
          needs_attention: studentAttention[assignment.id] ?? false,
          attention_remark: studentAttention[assignment.id] ? studentRemarks[assignment.id]?.trim() || null : null,
        })),
      })
    },
    onSuccess: () => setMessage('Meeting report saved.'),
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Unable to save meeting report.'),
  })

  if (!user) return null
  return (
    <div className="space-y-5">
      {message && <p className="rounded bg-blue-50 px-3 py-2 text-sm text-blue-800">{message}</p>}
      {role === 'admin' && (
        <section className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-1 font-semibold text-gray-900">Create meeting task</h2>
          <p className="mb-4 text-sm text-gray-500">Assign this meeting to a mentor below. Their current students will be included in the report.</p>
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
          <div className="mt-5 border-t pt-4">
            <h3 className="font-medium text-gray-900">Assign meeting to a mentor</h3>
            <p className="mt-1 text-xs text-gray-500">All students currently assigned to the mentor will be added to the report and the mentor will receive an automated chat.</p>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <select value={selectedTask} onChange={(event) => setSelectedTask(event.target.value)} className="rounded border px-3 py-2 text-sm">
                <option value="">Select meeting</option>
                {meetingTasks.map((task) => <option key={task.id} value={task.id}>Meeting {task.meeting_number}: {task.title}</option>)}
              </select>
              <select value={selectedMentor} onChange={(event) => setSelectedMentor(event.target.value)} className="rounded border px-3 py-2 text-sm">
                <option value="">Select mentor</option>
                {users.filter((candidate) => candidate.role === 'lecturer').map((mentor) => <option key={mentor.id} value={mentor.id}>{mentor.name}</option>)}
              </select>
              <button type="button" disabled={assignMeeting.isPending || !selectedTask || !selectedMentor} onClick={() => assignMeeting.mutate()} className="rounded bg-ums-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{assignMeeting.isPending ? 'Assigning…' : 'Assign meeting'}</button>
            </div>
            {selectedTask && taskMap.get(selectedTask)?.report_token && <p className="mt-2 break-all text-xs text-gray-500">Public report link: {window.location.origin}/meeting-report/{taskMap.get(selectedTask)?.report_token}</p>}
          </div>
        </section>
      )}

      {role === 'lecturer' && (
        <>
          <section className="space-y-3">
            <h2 className="font-semibold text-gray-900">Meeting report</h2>
            {assignments.length === 0 && <p className="text-sm text-gray-500">No meeting assignments yet.</p>}
            {Array.from(new Set(assignments.map((assignment) => assignment.meeting_task_id))).map((taskId) => {
              const task = taskMap.get(taskId)
              const taskAssignments = assignments.filter((assignment) => assignment.meeting_task_id === taskId)
              return <div key={taskId} className="rounded-lg bg-white p-4 shadow-sm">
                <p className="font-medium">Meeting {task?.meeting_number ?? '—'} · {task?.title}</p>
                <p className="mt-1 text-xs text-gray-500">Due: {task?.scheduled_end ? formatDate(task.scheduled_end) : task?.scheduled_start ? formatDate(task.scheduled_start) : 'No due date set'}</p>
                <textarea rows={3} value={overallByTask[taskId] ?? ''} onChange={(event) => setOverallByTask((current) => ({ ...current, [taskId]: event.target.value }))} placeholder="Overall summary of the meeting" className="mt-3 w-full rounded border px-3 py-2 text-sm" />
                <div className="mt-3 space-y-3">{taskAssignments.map((assignment) => <div key={assignment.id} className="rounded border p-3">
                  <p className="text-sm font-medium">{mentees.find((mentee) => mentee.id === assignment.student_id)?.name ?? 'Student'}</p>
                  {(() => {
                    const student = mentees.find((mentee) => mentee.id === assignment.student_id)
                    return student ? <p className="mt-1 text-xs text-gray-500">Matric: {student.matric_number ?? 'Missing'} · IC: {student.ic_number ?? 'Missing'} · Phone: {student.phone ?? 'Missing'}</p> : null
                  })()}
                  <textarea rows={2} value={studentComments[assignment.id] ?? ''} onChange={(event) => setStudentComments((current) => ({ ...current, [assignment.id]: event.target.value }))} placeholder="Comment about this student" className="mt-2 w-full rounded border px-3 py-2 text-sm" />
                  <label className="mt-2 flex items-center gap-2 text-sm font-medium text-red-700"><input type="checkbox" checked={studentAttention[assignment.id] ?? false} onChange={(event) => setStudentAttention((current) => ({ ...current, [assignment.id]: event.target.checked }))} /> Needs special attention</label>
                  {studentAttention[assignment.id] && <textarea rows={2} value={studentRemarks[assignment.id] ?? ''} onChange={(event) => setStudentRemarks((current) => ({ ...current, [assignment.id]: event.target.value }))} placeholder="Explain the concern" className="mt-2 w-full rounded border border-red-200 px-3 py-2 text-sm" />}
                </div>)}</div>
                <button type="button" disabled={saveMeetingReport.isPending || !(overallByTask[taskId] ?? '').trim()} onClick={() => saveMeetingReport.mutate(taskId)} className="mt-3 rounded bg-ums-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Save meeting report</button>
              </div>
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
