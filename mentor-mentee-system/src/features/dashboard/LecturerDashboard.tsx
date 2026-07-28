import { Link } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/authStore'
import { useMentees } from '@/features/chat/hooks/useChat'
import { useLecturerTasks } from '@/features/tasks/hooks/useTasks'
import PriorityBadge from '@/components/PriorityBadge'
import { formatDate } from '@/utils/formatDate'

// Widgets per PRD §8: mentee count, pending tasks, upcoming deadlines.
// (Recent submissions / online status / recent chats are left for later —
// this is the minimal working version.)
export default function LecturerDashboard() {
  const user = useAuthStore((s) => s.user)
  const { data: mentees } = useMentees(user?.id)
  const { data: tasks } = useLecturerTasks(user?.id)

  const upcoming = tasks
    ?.filter((t) => t.due_date && new Date(t.due_date) >= new Date())
    .slice(0, 5)

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-gray-900">Welcome back, {user?.name}</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h3 className="mb-1 text-sm font-semibold text-gray-500">Mentees</h3>
          <p className="text-2xl font-semibold text-gray-900">{mentees?.length ?? 0}</p>
          <Link to="/chat" className="text-xs text-ums-blue hover:underline">
            Message a mentee
          </Link>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h3 className="mb-1 text-sm font-semibold text-gray-500">Tasks assigned</h3>
          <p className="text-2xl font-semibold text-gray-900">{tasks?.length ?? 0}</p>
          <Link to="/tasks" className="text-xs text-ums-blue hover:underline">
            Manage tasks
          </Link>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm md:col-span-1 md:row-span-2">
          <h3 className="mb-2 text-sm font-semibold text-gray-500">Upcoming deadlines</h3>
          {upcoming && upcoming.length > 0 ? (
            <ul className="space-y-2">
              {upcoming.map((t) => (
                <li key={t.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-800">{t.title}</span>
                  <span className="flex items-center gap-2 text-xs text-gray-400">
                    {formatDate(t.due_date!)}
                    <PriorityBadge priority={t.priority} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">Nothing due soon.</p>
          )}
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm md:col-span-2">
          <h3 className="mb-2 text-sm font-semibold text-gray-500">Your mentees</h3>
          {mentees && mentees.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {mentees.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-gray-800">{m.name}</span>
                  <span className="text-xs text-gray-400">{m.programme}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">No mentees assigned yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
