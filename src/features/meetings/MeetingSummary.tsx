import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/authStore'
import * as adminService from '@/services/adminService'
import * as meetingService from '@/services/meetingService'
import { queryKeys } from '@/lib/queryKeys'
import { formatDate } from '@/utils/formatDate'

export default function MeetingSummary() {
  const user = useAuthStore((state) => state.user)
  const { data: tasks = [] } = useQuery({ queryKey: queryKeys.meetings.tasks(), queryFn: meetingService.listMeetingTasks })
  const { data: assignments = [] } = useQuery({ queryKey: queryKeys.meetings.assignments(), queryFn: () => meetingService.listAssignments() })
  const { data: reports = [], isLoading } = useQuery({ queryKey: queryKeys.meetings.reports(), queryFn: meetingService.listReports })
  const { data: users = [] } = useQuery({ queryKey: ['users', 'meeting-summary'], queryFn: adminService.listAllUsers })
  const taskMap = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks])
  const userMap = useMemo(() => new Map(users.map((candidate) => [candidate.id, candidate])), [users])
  const assignmentMap = useMemo(() => new Map(assignments.map((assignment) => [assignment.id, assignment])), [assignments])

  function downloadPdf() {
    const rows = reports.map((report) => {
      const assignment = assignmentMap.get(report.meeting_assignment_id)
      const task = assignment ? taskMap.get(assignment.meeting_task_id) : undefined
      const mentor = userMap.get(report.mentor_id)
      const student = userMap.get(report.student_id)
      return `<tr><td>Meeting ${task?.meeting_number ?? '—'}</td><td>${escapeHtml(mentor?.name ?? '—')}</td><td>${escapeHtml(student?.name ?? '—')}</td><td>${escapeHtml(report.overall_summary)}</td><td>${report.needs_attention ? `Immediate attention: ${escapeHtml(report.attention_remark ?? '')}` : 'No'}</td></tr>`
    }).join('')
    const popup = window.open('', '_blank')
    if (!popup) {
      window.alert('Please allow pop-ups to generate the PDF report.')
      return
    }
    popup.document.write(`<html><head><title>Mentor-Mentee Meeting Summary Report</title><style>
      body{font-family:Georgia,serif;color:#17233c;margin:40px}h1{text-align:center;font-size:22px;margin-bottom:4px}h2{text-align:center;font-size:14px;font-weight:normal;margin-top:0;color:#51627f}.meta{border-bottom:2px solid #17233c;padding-bottom:14px;margin-bottom:20px}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#17233c;color:white;text-align:left}th,td{border:1px solid #c8d0dc;padding:8px;vertical-align:top}tr:nth-child(even){background:#f4f6f9}.footer{margin-top:24px;font-size:10px;color:#51627f;text-align:center}@media print{body{margin:20px}}
    </style></head><body><div class="meta"><h1>PPST Mentor-Mentee Management System</h1><h2>Official Mentor Meeting Summary Report</h2><p><strong>Prepared by:</strong> ${escapeHtml(user?.name ?? 'Administrator')}<br><strong>Generated:</strong> ${new Date().toLocaleString()}</p></div><table><thead><tr><th>Meeting</th><th>Mentor</th><th>Student</th><th>Overall meeting summary</th><th>Immediate attention</th></tr></thead><tbody>${rows || '<tr><td colspan="5">No completed meeting reports.</td></tr>'}</tbody></table><p class="footer">This document is an official internal summary of mentor-mentee meetings. Please handle all student information confidentially.</p></body></html>`)
    popup.document.close()
    popup.focus()
    popup.print()
  }

  return (
    <section className="rounded-lg bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold text-gray-900">Summary meeting</h2><p className="text-sm text-gray-500">Compiled mentor summaries and students marked for immediate attention.</p></div>
        <button type="button" disabled={!reports.length} onClick={downloadPdf} className="rounded bg-ums-blue px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Download formal PDF</button>
      </div>
      {isLoading ? <p className="text-sm text-gray-500">Loading meeting summaries…</p> : (
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b text-xs text-gray-500"><th className="p-2">Meeting</th><th className="p-2">Mentor</th><th className="p-2">Student</th><th className="p-2">Overall summary</th><th className="p-2">Attention</th><th className="p-2">Completed</th></tr></thead><tbody className="divide-y">
          {reports.map((report) => {
            const assignment = assignmentMap.get(report.meeting_assignment_id)
            const task = assignment ? taskMap.get(assignment.meeting_task_id) : undefined
            return <tr key={report.id}><td className="p-2">Meeting {task?.meeting_number ?? '—'}</td><td className="p-2">{userMap.get(report.mentor_id)?.name ?? '—'}</td><td className="p-2">{userMap.get(report.student_id)?.name ?? '—'}</td><td className="max-w-sm p-2">{report.overall_summary}</td><td className={`p-2 font-medium ${report.needs_attention ? 'text-red-700' : 'text-green-700'}`}>{report.needs_attention ? report.attention_remark : 'No immediate attention'}</td><td className="p-2 text-xs text-gray-500">{formatDate(report.completed_at)}</td></tr>
          })}
        </tbody></table>{reports.length === 0 && <p className="py-6 text-sm text-gray-500">No completed meeting reports yet.</p>}</div>
      )}
    </section>
  )
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character] ?? character))
}
