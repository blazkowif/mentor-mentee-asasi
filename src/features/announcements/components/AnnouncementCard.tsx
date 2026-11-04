import { useState } from 'react'
import type { Database } from '@/types/database.types'
import { formatRelative } from '@/utils/formatDate'

type Announcement = Database['public']['Tables']['announcements']['Row']

export default function AnnouncementCard({
  announcement,
  onDelete,
  onEdit,
  authorName,
}: {
  announcement: Announcement
  onDelete?: () => void
  onEdit?: () => void
  authorName?: string
}) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-gray-900">{announcement.title}</h3>
          <p className="mt-0.5 text-xs text-ums-blue">Posted by {authorName ?? 'System administrator'}</p>
        </div>
        <span className="whitespace-nowrap text-xs text-gray-400">
          {formatRelative(announcement.created_at)}
        </span>
      </div>
      {announcement.content && (
        <p className="mb-2 whitespace-pre-wrap text-sm text-gray-600">{announcement.content}</p>
      )}
      {announcement.attachment && (
        <button
          type="button"
          onClick={() => setIsPreviewOpen(true)}
          className="mb-3 block w-full overflow-hidden rounded border border-gray-100 bg-gray-50 p-2 text-left"
          aria-label="View full announcement image"
        >
          <img
            src={announcement.attachment}
            alt="Announcement attachment"
            className="max-h-72 w-full object-contain"
            onError={(event) => {
              event.currentTarget.style.display = 'none'
              event.currentTarget.parentElement?.classList.add('p-3')
              if (event.currentTarget.parentElement) {
                event.currentTarget.parentElement.textContent = 'Open announcement attachment'
              }
            }}
          />
        </button>
      )}
      {(onEdit || onDelete) && (
        <div className="flex gap-3">
          {onEdit && <button onClick={onEdit} className="text-xs text-ums-blue hover:underline">Edit</button>}
          {onDelete && <button onClick={onDelete} className="text-xs text-red-600 hover:underline">Delete</button>}
        </div>
      )}
      {isPreviewOpen && announcement.attachment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Full announcement image"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div className="relative flex max-h-full max-w-6xl items-center justify-center" onClick={(event) => event.stopPropagation()}>
            <img src={announcement.attachment} alt="Full announcement attachment" className="max-h-[90vh] max-w-[90vw] object-contain" />
            <button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              className="absolute right-2 top-2 rounded-full bg-black/70 px-3 py-1 text-xl text-white hover:bg-black"
              aria-label="Close full image"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
