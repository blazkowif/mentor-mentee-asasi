import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import * as adminService from '@/services/adminService'
import { queryKeys } from '@/lib/queryKeys'

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<'profile' | 'activity'>('profile')

  const userId = id === 'none' ? undefined : id

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: queryKeys.users.all(),
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('*').order('role').order('name')
      if (error) throw error
      return data ?? []
    },
  })

  const user = userId ? users.find((u) => u.id === userId) : undefined

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: queryKeys.admin.activity(userId ?? 'none'),
    queryFn: () => (userId ? adminService.getUserActivity(userId, 50) : Promise.resolve([])),
    enabled: !!userId && activeTab === 'activity',
  })

  const mentor = useMemo(
    () => users.find((u) => u.id === user?.mentor_id),
    [users, user],
  )
  const mentees = useMemo(
    () => users.filter((u) => u.mentor_id === user?.id),
    [users, user],
  )

  if (usersLoading) return <p className="text-sm text-gray-500">Loading…</p>
  if (!userId) {
    return (
      <div>
        <p className="text-sm text-gray-500">No user selected.</p>
        <Link to="/admin/assignment" className="text-ums-blue">
          ← Back to assignment
        </Link>
      </div>
    )
  }
  if (!user) {
    return (
      <div>
        <p className="text-sm text-gray-500">User not found.</p>
        <Link to="/admin/search" className="text-ums-blue">
          Search
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">
          {user.name}{' '}
          <span className="text-sm text-gray-500">
            ({user.role} · {user.matric_number})
          </span>
        </h1>
        <div className="flex gap-2">
          <Link
            to="/admin/assignment"
            className="rounded bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm"
          >
            Assignment
          </Link>
          <Link
            to="/admin/search"
            className="rounded bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm"
          >
            Search
          </Link>
        </div>
      </div>

      <div className="mb-4 flex gap-2 border-b border-gray-100">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-3 py-1.5 text-sm font-medium ${activeTab === 'profile' ? 'border-b-2 border-ums-blue text-ums-blue' : 'text-gray-600'}`}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-3 py-1.5 text-sm font-medium ${activeTab === 'activity' ? 'border-b-2 border-ums-blue text-ums-blue' : 'text-gray-600'}`}
        >
          Activity
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-gray-500">
              {user.role === 'student' ? 'Student info' : 'Lecturer info'}
            </h3>
            <dl className="space-y-1 text-sm">
              <div>
                <dt className="text-gray-400">Name</dt>
                <dd className="text-gray-900">{user.name}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Email</dt>
                <dd className="text-gray-900">{user.email ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Matric / Staff</dt>
                <dd className="text-gray-900">{user.matric_number ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Programme</dt>
                <dd className="text-gray-900">{user.programme ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Joined</dt>
                <dd className="text-gray-900">
                  {user.created_at ? format(new Date(user.created_at), 'PPpp') : '—'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-gray-500">
              {user.role === 'student' ? 'Mentor details' : 'Mentees'}
            </h3>
            {user.role === 'student' ? (
              mentor ? (
                <div className="rounded-lg border border-gray-100 p-3">
                  <p className="font-medium text-gray-900">{mentor.name}</p>
                  <p className="text-xs text-gray-500">{mentor.email}</p>
                  <p className="text-xs text-gray-600">
                    Mentees: {mentees.length}
                  </p>
                  <Link
                    to={`/admin/lecturer/${mentor.id}`}
                    className="text-xs text-ums-blue hover:underline"
                  >
                    View lecturer profile →
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-red-600">No mentor assigned</p>
              )
            ) : (
              <div>
                <p className="text-sm text-gray-600">Total mentees: {mentees.length}</p>
                <div className="mt-2 max-h-48 space-y-1 overflow-auto">
                  {mentees.map((m) => (
                    <Link
                      key={m.id}
                      to={`/admin/student/${m.id}`}
                      className="block text-xs text-ums-blue hover:underline"
                    >
                      {m.name} {m.matric_number && `(${m.matric_number})`}
                    </Link>
                  ))}
                  {mentees.length === 0 && (
                    <p className="text-sm text-gray-400">No mentees yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-gray-500">Activity</h3>
          {logsLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-gray-500">No activity recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {logs.map((l) => (
                <li key={l.id} className="text-sm">
                  <span className="text-xs text-gray-400">
                    {(l.timestamp ? format(new Date(l.timestamp), 'PP p') : '—')}
                  </span>{' '}
                  <span className="text-gray-900">{l.action}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
