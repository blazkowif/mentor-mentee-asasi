import { useState } from 'react'

interface AnnouncementFormProps {
  onSubmit: (values: { title: string; content: string }) => void
  isSubmitting?: boolean
  onCancel: () => void
}

export default function AnnouncementForm({
  onSubmit,
  isSubmitting,
  onCancel,
}: AnnouncementFormProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({ title, content })
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 rounded-lg bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-ums-blue">New announcement</h3>

      <label className="mb-1 block text-xs font-medium text-gray-600">Title</label>
      <input
        className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      <label className="mb-1 block text-xs font-medium text-gray-600">Content</label>
      <textarea
        className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm"
        rows={4}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

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
          {isSubmitting ? 'Posting…' : 'Post announcement'}
        </button>
      </div>
    </form>
  )
}
