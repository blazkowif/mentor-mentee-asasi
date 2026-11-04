import { useState } from 'react'
import type { Database } from '@/types/database.types'

type Priority = Database['public']['Tables']['tasks']['Row']['priority']

interface TaskFormProps {
  onSubmit: (values: {
    title: string
    description: string
    due_date: string | null
    priority: Priority
    target_role?: 'student' | 'lecturer' | null
    target_student_id?: string | null
  }) => void
  isSubmitting?: boolean
  onCancel: () => void
  audienceOptions?: Array<{ value: 'student' | 'lecturer' | 'all'; label: string }>
  studentOptions?: Array<{ id: string; name: string }>
}

export default function TaskForm({ onSubmit, isSubmitting, onCancel, audienceOptions, studentOptions = [] }: TaskFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [audience, setAudience] = useState<'student' | 'lecturer' | 'all'>('student')
  const [studentId, setStudentId] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      title,
      description,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      priority,
      target_role: audience === 'all' ? null : audience,
      target_student_id: studentId || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 rounded-lg bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-ums-blue">New task</h3>

      <label className="mb-1 block text-xs font-medium text-gray-600">Title</label>
      <input
        className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      <label className="mb-1 block text-xs font-medium text-gray-600">Description</label>
      <textarea
        className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm"
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Due date</label>
          <input
            type="date"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        {audienceOptions && (
          <div className="mb-3 grid grid-cols-2 gap-3">
            <label className="text-xs font-medium text-gray-600">Audience
              <select className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" value={audience} onChange={(e) => setAudience(e.target.value as typeof audience)}>
                {audienceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            {audience === 'student' && studentOptions.length > 0 && (
              <label className="text-xs font-medium text-gray-600">Specific student (optional)
                <select className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                  <option value="">All students</option>
                  {studentOptions.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
                </select>
              </label>
            )}
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Priority</label>
          <select
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-ums-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-ums-blue-light disabled:opacity-60"
        >
          {isSubmitting ? 'Creating…' : 'Create task'}
        </button>
      </div>
    </form>
  )
}
