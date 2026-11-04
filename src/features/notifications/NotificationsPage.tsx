import clsx from 'clsx'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/authStore'
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from './hooks/useNotifications'
import { formatRelative } from '@/utils/formatDate'
import { useNavigate } from 'react-router-dom'
import * as mentorNotesService from '@/services/mentorNotesService'

// Notification center (PRD §13).
export default function NotificationsPage() {
  const user = useAuthStore((s) => s.user)
  const { data: notifications, isLoading } = useNotifications(user?.id)
  const markRead = useMarkNotificationRead(user?.id ?? '')
  const markAllRead = useMarkAllNotificationsRead(user?.id ?? '')
  const navigate = useNavigate()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { data: attentionFlags = [] } = useQuery({
    queryKey: ['notifications', 'attention-flags'],
    queryFn: () => mentorNotesService.listAttentionFlags(),
    enabled: user?.role === 'admin',
  })

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
          <div
            key={n.id}
            className={clsx(
              'block w-full rounded-lg p-3 text-left shadow-sm',
              n.is_read ? 'bg-white' : 'bg-blue-50',
            )}
          >
            <button type="button" onClick={() => {
              if (!n.is_read) markRead.mutate(n.id)
              if (n.reference_type === 'chat_user' && n.reference_id) navigate(`/chat?user=${n.reference_id}`)
              if (n.reference_type === 'attention_flag') setExpandedId(expandedId === n.id ? null : n.id)
            }} className="block w-full text-left">
              <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-medium text-gray-900">{n.title}</span>
              <span className="flex items-center gap-2 whitespace-nowrap text-xs text-gray-400">
                {!n.is_read && <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">New</span>}
                {formatRelative(n.created_at)}
              </span>
              </div>
              {n.body && <p className="mt-1 text-sm text-gray-600">{n.body}</p>}
            </button>
            {expandedId === n.id && n.reference_type === 'attention_flag' && (
              <div className="mt-3 rounded border border-red-100 bg-red-50 p-3 text-sm text-gray-700">
                {(() => {
                  const flag = attentionFlags.find((item) => item.id === n.reference_id)
                  if (!flag) return <p>Attention details are unavailable.</p>
                  return (
                    <>
                      <p className="font-medium capitalize">{flag.severity.replace('_', ' ')} · {flag.status.replace('_', ' ')}</p>
                      <p className="mt-1">{flag.reason}</p>
                      <Link to={`/admin/student/${flag.student_id}`} className="mt-2 inline-block text-ums-blue hover:underline">View student details →</Link>
                    </>
                  )
                })()}
              </div>
            )}
          </div>
        ))}
        {notifications?.length === 0 && (
          <p className="text-sm text-gray-500">You're all caught up.</p>
        )}
      </div>
    </div>
  )
}
