import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import * as adminService from '@/services/adminService'
import { queryKeys } from '@/lib/queryKeys'

export default function AdminDashboard() {
  const { data: users = [], isLoading, isError, error } = useQuery({
    queryKey: queryKeys.users.all(),
    queryFn: adminService.listAllUsers,
  })

  if (isLoading) return <p className="text-sm text-gray-500">Loading admin dashboard…</p>
  if (isError) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
        Unable to load admin statistics: {error instanceof Error ? error.message : 'Supabase returned an unknown error.'}
        <p className="mt-1">Confirm this account has a matching row in public.users with role admin.</p>
      </div>
    )
  }

  const students = users.filter((user) => user.role === 'student')
  const lecturers = users.filter((user) => user.role === 'lecturer')
  const admins = users.filter((user) => user.role === 'admin')
  const unassigned = students.filter((student) => !student.mentor_id).length

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Admin dashboard</h1>
          <p className="text-sm text-gray-500">A quick overview of the system.</p>
        </div>
        <Link
          to="/admin/control"
          className="rounded bg-ums-blue px-4 py-2 text-sm font-medium text-white hover:bg-ums-blue-light"
        >
          Open admin control
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Students" value={students.length} />
        <SummaryCard label="Lecturers" value={lecturers.length} />
        <SummaryCard label="Administrators" value={admins.length} />
        <SummaryCard label="Unassigned students" value={unassigned} warning={unassigned > 0} />
      </div>

      <div className="mt-6 rounded-lg bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-gray-900">Admin actions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ActionLink to="/admin/control?tab=users" label="Manage users" />
          <ActionLink to="/admin/control?tab=import" label="Import Excel" />
          <ActionLink to="/admin/control?tab=assignment" label="Reassign mentors" />
          <ActionLink to="/admin/control?tab=content" label="Announcements & assignments" />
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${warning ? 'text-red-700' : 'text-gray-900'}`}>{value}</p>
    </div>
  )
}

function ActionLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="rounded border border-gray-200 px-4 py-3 text-sm text-gray-700 hover:border-ums-blue hover:text-ums-blue">
      {label} →
    </Link>
  )
}
