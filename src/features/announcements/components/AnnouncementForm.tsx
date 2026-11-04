import { useState } from 'react'

interface AnnouncementFormProps {
  onSubmit: (values: { title: string; content: string; audience: 'group' | 'all' | 'staff' | 'global'; attachment: File | null }) => void
  audienceOptions?: Array<{ value: 'group' | 'all' | 'staff' | 'global'; label: string }>
  initialValues?: { title: string; content: string; attachment: string | null; audience: 'group' | 'all' | 'staff' | 'global' }
  isSubmitting?: boolean
  onCancel: () => void
}

export default function AnnouncementForm({
  onSubmit,
  isSubmitting,
  onCancel,
  audienceOptions,
  initialValues,
}: AnnouncementFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [content, setContent] = useState(initialValues?.content ?? '')
  const [audience, setAudience] = useState<'group' | 'all' | 'staff' | 'global'>(initialValues?.audience ?? 'group')
  const [attachment, setAttachment] = useState<File | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({ title, content, audience, attachment })
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

      {audienceOptions && (
        <>
          <label className="mb-1 block text-xs font-medium text-gray-600">Audience</label>
          <select
            className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            value={audience}
            onChange={(e) => setAudience(e.target.value as typeof audience)}
          >
            {audienceOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </>
      )}

      <label className="mb-3 block text-xs font-medium text-gray-600">
        Image attachment
        <input type="file" accept="image/*" className="mt-1 block w-full text-sm" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)} />
        {initialValues?.attachment && <span className="mt-1 block text-xs text-gray-500">An image is already attached. Choose a new one to replace it.</span>}
      </label>

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
          {isSubmitting ? 'Saving…' : initialValues ? 'Save announcement' : 'Post announcement'}
        </button>
      </div>
    </form>
  )
}
