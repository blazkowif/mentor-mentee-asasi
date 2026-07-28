import clsx from 'clsx'
import { useAuthStore } from '@/features/auth/authStore'
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from './hooks/useNotifications'
import { formatRelative } from '@/utils/formatDate'

// Notification center (PRD §13).
export default function NotificationsPage() {
  const user = useAuthStore((s) => s.user)
  const { data: notifications, isLoading } = useNotifications(user?.id)
  const markRead = useMarkNotificationRead(user?.id ?? '')
  const markAllRead = useMarkAllNotificationsRead(user?.id ?? '')

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Notifications</h1>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            className="text-sm text-ums-blue hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      <div className="space-y-2">
        {notifications?.map((n) => (
          <button
            key={n.id}
            onClick={() => !n.is_read && markRead.mutate(n.id)}
            className={clsx(
              'block w-full rounded-lg p-3 text-left shadow-sm',
              n.is_read ? 'bg-white' : 'bg-blue-50',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-medium text-gray-900">{n.title}</span>
              <span className="whitespace-nowrap text-xs text-gray-400">
                {formatRelative(n.created_at)}
              </span>
            </div>
            {n.body && <p className="mt-1 text-sm text-gray-600">{n.body}</p>}
          </button>
        ))}
        {notifications?.length === 0 && (
          <p className="text-sm text-gray-500">You're all caught up.</p>
        )}
      </div>
    </div>
  )
}
