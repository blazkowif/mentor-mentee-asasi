import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/authStore'
import { useMentees } from '@/features/chat/hooks/useChat'
import * as mentorNotesService from '@/services/mentorNotesService'
import type { AttentionSeverity, MentorNoteCategory } from '@/types/database.types'
import { queryKeys } from '@/lib/queryKeys'

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
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [studentId, setStudentId] = useState('')
  const [category, setCategory] = useState<MentorNoteCategory>('general')
  const [note, setNote] = useState('')
  const [remark, setRemark] = useState(false)
  const [severity, setSeverity] = useState<AttentionSeverity>('needs_attention')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
  const { data: allMentorNotes = [], isLoading: allNotesLoading } = useQuery({
    queryKey: queryKeys.mentorNotes.byMentor(user?.id ?? ''),
    queryFn: () => mentorNotesService.listMentorNotes(),
    enabled: !!user?.id,
  })
  const { data: selectedNotes = [], isLoading: selectedNotesLoading } = useQuery({
    queryKey: queryKeys.mentorNotes.byStudent(studentId),
    queryFn: () => mentorNotesService.listMentorNotes(studentId),
    enabled: !!studentId,
  })
  const { data: internalNotes = [] } = useQuery({
    queryKey: queryKeys.internalNotes.byTarget(studentId),
    queryFn: () => mentorNotesService.listInternalNotes(studentId),
    enabled: !!studentId,
  })
  const { data: notesForMentor = [] } = useQuery({
    queryKey: queryKeys.internalNotes.byTarget(user?.id ?? ''),
    queryFn: () => mentorNotesService.listInternalNotes(user!.id),
    enabled: !!user?.id,
  })

  useEffect(() => {
    const requestedStudentId = searchParams.get('student')
    if (requestedStudentId && mentees.some((mentee) => mentee.id === requestedStudentId)) {
      setStudentId(requestedStudentId)
      setShowForm(true)
    }
  }, [mentees, searchParams])

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
      await queryClient.invalidateQueries({ queryKey: queryKeys.mentorNotes.byStudent(studentId) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.mentorNotes.byMentor(user.id) })
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
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Private mentor notes</h1>
          <p className="text-sm text-gray-500">Notes are visible only to you and administrators. Students cannot see them.</p>
        </div>
        <button type="button" onClick={() => setShowForm((open) => !open)} className="rounded bg-ums-blue px-3 py-2 text-sm font-medium text-white hover:bg-ums-blue-light">
          {showForm ? 'Close note form' : '+ Add new note'}
        </button>
      </div>
      {showForm && <form onSubmit={handleSubmit} className="rounded-lg bg-white p-4 shadow-sm">
        <label className="mb-1 block text-sm font-medium text-gray-700">Mentee</label>
        <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="mb-3 w-full rounded border border-gray-200 px-3 py-2 text-sm" required>
          <option value="">Select a mentee</option>
          {mentees.map((mentee) => <option key={mentee.id} value={mentee.id}>{mentee.name} {mentee.matric_number ? `(${mentee.matric_number})` : ''}</option>)}
        </select>

        {studentId && (() => {
          const selectedMentee = mentees.find((mentee) => mentee.id === studentId)
          if (!selectedMentee) return null
          return (
            <div className="mb-4 rounded border border-blue-100 bg-blue-50 p-3 text-sm">
              <p className="font-medium text-gray-900">{selectedMentee.name}</p>
              <p className="text-xs text-gray-600">{selectedMentee.matric_number || 'No matric number'} · {selectedMentee.programme || 'Programme not set'}</p>
              <p className="mt-1 text-xs text-gray-500">{selectedMentee.email || 'No email recorded'} · {selectedMentee.phone || 'No phone recorded'}</p>
            </div>
          )
        })()}

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
      </form>}

      <section className="mt-5 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Notes you have left</h2>
        {allNotesLoading ? <p className="text-sm text-gray-500">Loading notes…</p> : allMentorNotes.length === 0 ? (
          <p className="text-sm text-gray-500">No private notes recorded yet.</p>
        ) : (
          <ul className="space-y-3">
            {allMentorNotes.map((entry) => {
              const mentee = mentees.find((candidate) => candidate.id === entry.student_id)
              return (
                <li key={entry.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-gray-900">{mentee?.name ?? 'Student'}</span>
                    <span className="text-xs text-gray-500">{format(new Date(entry.created_at), 'PPp')}</span>
                  </div>
                  <p className="mt-1 text-xs font-medium uppercase text-amber-800">{entry.category.replace('_', ' ')}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{entry.note}</p>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {studentId && (
        <section className="mt-5 rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Previous private notes</h2>
          {selectedNotesLoading ? <p className="text-sm text-gray-500">Loading notes…</p> : selectedNotes.length === 0 ? (
            <p className="text-sm text-gray-500">No private notes recorded for this mentee.</p>
          ) : (
            <ul className="space-y-2">
              {selectedNotes.map((entry) => (
                <li key={entry.id} className="rounded border border-gray-100 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="capitalize text-xs font-medium text-gray-500">{entry.category.replace('_', ' ')}</span>
                    <span className="text-xs text-gray-400">{format(new Date(entry.created_at), 'PPp')}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-gray-700">{entry.note}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {studentId && internalNotes.length > 0 && (
        <section className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Internal admin notes</h2>
          <p className="mb-2 text-xs text-gray-500">These notes are shared with mentors for coordination and are not visible to the mentee.</p>
          <ul className="space-y-2">
            {internalNotes.map((entry) => (
              <li key={entry.id} className="rounded bg-white p-3 text-sm text-gray-700">
                <p className="whitespace-pre-wrap">{entry.note}</p>
                <p className="mt-1 text-xs text-gray-400">{format(new Date(entry.created_at), 'PPp')}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {notesForMentor.length > 0 && (
        <section className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Internal notes from administration</h2>
          <ul className="space-y-2">
            {notesForMentor.map((entry) => (
              <li key={entry.id} className="rounded bg-white p-3 text-sm text-gray-700">
                <p className="whitespace-pre-wrap">{entry.note}</p>
                <p className="mt-1 text-xs text-gray-400">{format(new Date(entry.created_at), 'PPp')}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-5 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Privacy reminder</h2>
        <p className="text-sm text-gray-500">Use factual, professional language. An attention remark notifies administrators and is retained for student-support review.</p>
        {mentees.length > 0 && <p className="mt-3 text-xs text-gray-400">Assigned mentees: {mentees.length} · {format(new Date(), 'PP')}</p>}
      </div>
    </div>
  )
}
