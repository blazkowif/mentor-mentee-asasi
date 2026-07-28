import { Link } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/authStore'
import { useMentor } from '@/features/chat/hooks/useChat'
import { useMentorTasks } from '@/features/tasks/hooks/useTasks'
import { useMentorAnnouncements } from '@/features/announcements/hooks/useAnnouncements'
import { useNotifications } from '@/features/notifications/hooks/useNotifications'
import PriorityBadge from '@/components/PriorityBadge'
import { formatDate, formatRelative } from '@/utils/formatDate'

// Widgets per PRD §8: welcome, mentor info, upcoming tasks, recent
// announcements, latest messages, task progress, notifications.
export default function StudentDashboard() {
  const user = useAuthStore((s) => s.user)
  const { data: mentor } = useMentor(user?.mentor_id)
  const { data: tasks } = useMentorTasks(user?.mentor_id)
  const { data: announcements } = useMentorAnnouncements(user?.mentor_id)
  const { data: notifications } = useNotifications(user?.id)

  const upcomingTasks = tasks
    ?.filter((t) => !t.due_date || new Date(t.due_date) >= new Date())
    .slice(0, 4)
  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-gray-900">Welcome back, {user?.name}</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-gray-500">Your mentor</h3>
          {mentor ? (
            <div>
              <p className="font-medium text-gray-900">{mentor.name}</p>
              <p className="text-sm text-gray-500">{mentor.email}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Not yet assigned.</p>
          )}
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm md:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-500">Upcoming tasks</h3>
            <Link to="/tasks" className="text-xs text-ums-blue hover:underline">
              View all
            </Link>
          </div>
          {upcomingTasks && upcomingTasks.length > 0 ? (
            <ul className="space-y-2">
              {upcomingTasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-800">{t.title}</span>
                  <span className="flex items-center gap-2 text-xs text-gray-400">
                    {t.due_date && formatDate(t.due_date)}
                    <PriorityBadge priority={t.priority} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">Nothing due — you're on track.</p>
          )}
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm md:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-500">Recent announcements</h3>
            <Link to="/announcements" className="text-xs text-ums-blue hover:underline">
              View all
            </Link>
          </div>
          {announcements && announcements.length > 0 ? (
            <ul className="space-y-2">
              {announcements.slice(0, 3).map((a) => (
                <li key={a.id} className="text-sm">
                  <span className="text-gray-800">{a.title}</span>{' '}
                  <span className="text-xs text-gray-400">{formatRelative(a.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">No announcements yet.</p>
          )}
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-gray-500">Notifications</h3>
          <Link to="/notifications" className="text-sm text-ums-blue hover:underline">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </Link>
        </div>
      </div>
    </div>
  )
}
