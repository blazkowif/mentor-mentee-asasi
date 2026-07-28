import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import * as userService from '@/services/userService'

// Minimal working admin dashboard: lecturer activity (mentee load per
// lecturer) + student roster. Login/messaging/engagement metrics from
// PRD §8 need activity_logs data wired up — left for a later pass.
export default function AdminDashboard() {
  const { data: users, isLoading } = useQuery({
    queryKey: queryKeys.users.all(),
    queryFn: userService.listAllUsers,
  })

  const students = users?.filter((u) => u.role === 'student') ?? []
  const lecturers = users?.filter((u) => u.role === 'lecturer') ?? []

  const lecturerRows = lecturers.map((l) => ({
    ...l,
    menteeCount: students.filter((s) => s.mentor_id === l.id).length,
  }))

  if (isLoading) return <p className="text-sm text-gray-500">Loading…</p>

  return (
    <div>
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h3 className="mb-1 text-sm font-semibold text-gray-500">Total students</h3>
          <p className="text-2xl font-semibold text-gray-900">{students.length}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h3 className="mb-1 text-sm font-semibold text-gray-500">Total lecturers</h3>
          <p className="text-2xl font-semibold text-gray-900">{lecturers.length}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-500">Lecturer activity</h3>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-gray-400">
                <th className="pb-2 font-medium">Lecturer</th>
                <th className="pb-2 font-medium">Mentees</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lecturerRows.map((l) => (
                <tr key={l.id}>
                  <td className="py-1.5 text-gray-800">{l.name}</td>
                  <td className="py-1.5 text-gray-600">{l.menteeCount}</td>
                </tr>
              ))}
              {lecturerRows.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-2 text-sm text-gray-400">
                    No lecturers yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-500">Students</h3>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-gray-400">
                <th className="pb-2 font-medium">Student</th>
                <th className="pb-2 font-medium">Programme</th>
                <th className="pb-2 font-medium">Mentor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((s) => (
                <tr key={s.id}>
                  <td className="py-1.5 text-gray-800">{s.name}</td>
                  <td className="py-1.5 text-gray-600">{s.programme}</td>
                  <td className="py-1.5 text-gray-600">
                    {lecturers.find((l) => l.id === s.mentor_id)?.name ?? '—'}
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-2 text-sm text-gray-400">
                    No students yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
