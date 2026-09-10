import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import * as adminService from '@/services/adminService'
import { queryKeys } from '@/lib/queryKeys'

export default function AdminSearchPage() {
  const [q, setQ] = useState('')
  const { data: results = [], isLoading } = useQuery({
    queryKey: queryKeys.admin.search(q),
    queryFn: () => adminService.searchUsers(q),
    enabled: q.trim().length >= 2,
  })

  const students = useMemo(
    () => results.filter((r) => r.role === 'student'),
    [results],
  )
  const lecturers = useMemo(
    () => results.filter((r) => r.role === 'lecturer'),
    [results],
  )

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-gray-900">Search</h1>
      <input
        className="mb-4 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
        placeholder="Search name, email, matric / staff ID…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {isLoading && <p className="text-sm text-gray-500">Searching…</p>}
      {q.trim().length > 0 && q.trim().length < 2 && (
        <p className="text-sm text-gray-500">Type at least 2 characters.</p>
      )}

      {students.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-gray-500">Students</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {students.map((s) => (
              <Link
                key={s.id}
                to={`/admin/student/${s.id}`}
                className="block rounded-lg bg-white p-4 shadow-sm hover:bg-gray-50"
              >
                <p className="font-medium text-gray-900">{s.name}</p>
                <p className="text-sm text-gray-600">{s.programme}</p>
                <p className="text-xs text-gray-500">{s.email}</p>
                <p className="text-xs text-ums-blue">
                  {s.mentor_id ? 'View mentor →' : 'No mentor assigned'}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
      {lecturers.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-500">Lecturers</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {lecturers.map((l) => (
              <div
                key={l.id}
                className="block rounded-lg bg-white p-4 shadow-sm hover:bg-gray-50"
              >
                <p className="font-medium text-gray-900">{l.name}</p>
                <p className="text-xs text-gray-500">{l.email}</p>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <Link to={`/admin/lecturer/${l.id}`} className="text-ums-blue hover:underline">
                    View profile →
                  </Link>
                  <Link
                    to={`/chat?user=${encodeURIComponent(l.id)}`}
                    className="font-medium text-ums-blue hover:underline"
                  >
                    Chat
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {!isLoading && q.trim().length >= 2 && results.length === 0 && (
        <p className="text-sm text-gray-500">No matching users found.</p>
      )}
    </div>
  )
}
