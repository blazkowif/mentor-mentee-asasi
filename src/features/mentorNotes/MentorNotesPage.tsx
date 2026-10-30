import { useState } from 'react'
import { format } from 'date-fns'
import { useAuthStore } from '@/features/auth/authStore'
import { useMentees } from '@/features/chat/hooks/useChat'
import * as mentorNotesService from '@/services/mentorNotesService'
import type { AttentionSeverity, MentorNoteCategory } from '@/types/database.types'

const categories: Array<{ value: MentorNoteCategory; label: string }> = [
  { value: 'general', label: 'General observation' },
  { value: 'academic', label: 'Academic progress' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'welfare', label: 'Personal / welfare' },
  { value: 'behaviour', label: 'Behaviour' },
  { value: 'financial', label: 'Financial concern' },
  { value: 'follow_up', label: 'Follow-up required' },
  { value: 'other', label: 'Other' },
]

export default function MentorNotesPage() {
  const user = useAuthStore((s) => s.user)
  const { data: mentees = [] } = useMentees(user?.id)
  const [studentId, setStudentId] = useState('')
  const [category, setCategory] = useState<MentorNoteCategory>('general')
  const [note, setNote] = useState('')
  const [remark, setRemark] = useState(false)
  const [severity, setSeverity] = useState<AttentionSeverity>('needs_attention')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !studentId || !note.trim() || (remark && !reason.trim())) return
    setSaving(true)
    setMessage('')
    try {
      await mentorNotesService.createMentorNote({
        student_id: studentId,
        mentor_id: user.id,
        category,
        note: note.trim(),
      })
      if (remark) {
        await mentorNotesService.createAttentionFlag({
          student_id: studentId,
          mentor_id: user.id,
          severity,
          reason: reason.trim(),
        })
      }
      setNote('')
      setReason('')
      setRemark(false)
      setMessage(remark ? 'Private note saved and admin notified.' : 'Private note saved.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save the note.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-lg font-semibold text-gray-900">Private mentor notes</h1>
      <p className="mb-4 text-sm text-gray-500">
        Notes are visible only to you and administrators. Students cannot see them.
      </p>
      <form onSubmit={handleSubmit} className="rounded-lg bg-white p-4 shadow-sm">
        <label className="mb-1 block text-sm font-medium text-gray-700">Mentee</label>
        <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="mb-3 w-full rounded border border-gray-200 px-3 py-2 text-sm" required>
          <option value="">Select a mentee</option>
          {mentees.map((mentee) => <option key={mentee.id} value={mentee.id}>{mentee.name} {mentee.matric_number ? `(${mentee.matric_number})` : ''}</option>)}
        </select>

        <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value as MentorNoteCategory)} className="mb-3 w-full rounded border border-gray-200 px-3 py-2 text-sm">
          {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>

        <label className="mb-1 block text-sm font-medium text-gray-700">Private note</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={5} className="mb-3 w-full rounded border border-gray-200 px-3 py-2 text-sm" placeholder="Record the observation or discussion..." required />

        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input type="checkbox" checked={remark} onChange={(e) => setRemark(e.target.checked)} />
          Mark this student for admin attention
        </label>
        {remark && (
          <div className="mt-3 rounded border border-red-100 bg-red-50 p-3">
            <label className="mb-1 block text-sm font-medium text-gray-700">Severity</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value as AttentionSeverity)} className="mb-3 w-full rounded border border-gray-200 px-3 py-2 text-sm">
              <option value="monitor">Monitor</option>
              <option value="needs_attention">Needs attention</option>
              <option value="urgent">Urgent attention</option>
            </select>
            <label className="mb-1 block text-sm font-medium text-gray-700">Reason for admin attention</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full rounded border border-gray-200 px-3 py-2 text-sm" required />
          </div>
        )}
        <div className="mt-4 flex items-center gap-3">
          <button type="submit" disabled={saving} className="rounded bg-ums-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {saving ? 'Saving…' : 'Save private note'}
          </button>
          {message && <span className="text-sm text-gray-600">{message}</span>}
        </div>
      </form>

      <div className="mt-5 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Privacy reminder</h2>
        <p className="text-sm text-gray-500">Use factual, professional language. An attention remark notifies administrators and is retained for student-support review.</p>
        {mentees.length > 0 && <p className="mt-3 text-xs text-gray-400">Assigned mentees: {mentees.length} · {format(new Date(), 'PP')}</p>}
      </div>
    </div>
  )
}
