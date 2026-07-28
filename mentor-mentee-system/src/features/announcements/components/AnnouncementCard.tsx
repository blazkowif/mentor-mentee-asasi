import type { Database } from '@/types/database.types'
import { formatRelative } from '@/utils/formatDate'

type Announcement = Database['public']['Tables']['announcements']['Row']

export default function AnnouncementCard({
  announcement,
  onDelete,
}: {
  announcement: Announcement
  onDelete?: () => void
}) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-start justify-between gap-2">
        <h3 className="font-medium text-gray-900">{announcement.title}</h3>
        <span className="whitespace-nowrap text-xs text-gray-400">
          {formatRelative(announcement.created_at)}
        </span>
      </div>
      {announcement.content && (
        <p className="mb-2 whitespace-pre-wrap text-sm text-gray-600">{announcement.content}</p>
      )}
      {announcement.attachment && (
        <a
          href={announcement.attachment}
          target="_blank"
          rel="noreferrer"
          className="mb-2 block text-sm text-ums-blue underline"
        >
          View attachment
        </a>
      )}
      {onDelete && (
        <button onClick={onDelete} className="text-xs text-red-600 hover:underline">
          Delete
        </button>
      )}
    </div>
  )
}
