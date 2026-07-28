import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import * as adminService from '@/services/adminService'
import { queryKeys } from '@/lib/queryKeys'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const PROGRAMMES = [
  'Asasi Sains',
  'Asasi Teknologi',
  'Asasi Agrisains',
  'Asasi Sains Sosial',
] as const

function ProgrammeChip({ label, count, unassigned }: { label: string; count: number; unassigned: number }) {
  const colour =
    label === 'Asasi Sains'
      ? 'bg-blue-50 text-blue-700'
      : label === 'Asasi Teknologi'
        ? 'bg-purple-50 text-purple-700'
        : label === 'Asasi Agrisains'
          ? 'bg-green-50 text-green-700'
          : 'bg-amber-50 text-amber-700'
  return (
    <div className="rounded-lg border border-gray-100 p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{count}</p>
      {unassigned > 0 && (
        <Link
          to={`/admin/assignment?programme=${encodeURIComponent(label)}`}
          className="mt-2 inline-block rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700"
        >
          {unassigned} unassigned → assign
        </Link>
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const qc = useQueryClient()
  const { data: users, isLoading } = useQuery({
    queryKey: queryKeys.users.all(),
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('*').order('role').order('name')
      if (error) throw error
      return data ?? []
    },
  })

  const { data: activity = [], isLoading: activityLoading } = useQuery({
    queryKey: queryKeys.admin.activity('recent'),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(25)
      if (error) throw error
      return data ?? []
    },
  })

  const autoAssign = useMutation({
    mutationFn: async (programme?: string) => adminService.autoAssignMentors({ programme }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users.all() })
    },
  })

  const students = useMemo(() => users?.filter((u) => u.role === 'student') ?? [], [users])
  const lecturers = useMemo(() => users?.filter((u) => u.role === 'lecturer') ?? [], [users])

  const lecturerMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of students) {
      if (s.mentor_id) map.set(s.mentor_id, (map.get(s.mentor_id) ?? 0) + 1)
    }
    return map
  }, [students])

  if (isLoading) return <p className="text-sm text-gray-500">Loading dashboard…</p>

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Admin Dashboard</h1>
        <Link
          to="/admin/search"
          className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm"
        >
          Search
        </Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PROGRAMMES.map((p) => {
          const count = students.filter((s) => s.programme === p).length
          const missing = students.filter(
            (s) => s.programme === p && !s.mentor_id,
          ).length
          return <ProgrammeChip key={p} label={p} count={count} unassigned={missing} />
        })}
      </div>

      <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-gray-500">
          Unassigned students by programme
        </p>
        <div className="flex flex-wrap gap-2">
          {PROGRAMMES.map((p) => {
            const missing = students.filter(
              (s) => s.programme === p && !s.mentor_id,
            ).length
            return (
              <button
                key={p}
                onClick={() => autoAssign.mutate(p)}
                disabled={autoAssign.isPending}
                className="rounded bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-50"
              >
                {p}: {missing} empty
              </button>
            )
          })}
          <button
            onClick={() => autoAssign.mutate()}
            disabled={autoAssign.isPending}
            className="rounded bg-ums-blue px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Auto-assign all
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-gray-500">Lecturer activity</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-gray-400">
                <th className="pb-2 font-medium">Lecturer</th>
                <th className="pb-2 font-medium">Mentees</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lecturers.map((l) => (
                <tr key={l.id}>
                  <td className="py-1.5 text-gray-800">{l.name}</td>
                  <td className="py-1.5 text-gray-600">
                    {lecturerMap.get(l.id) ?? 0}
                  </td>
                </tr>
              ))}
              {lecturers.length === 0 && (
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
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-gray-500">Students</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-gray-400">
                <th className="pb-2 font-medium">Student</th>
                <th className="pb-2 font-medium">Programme</th>
                <th className="pb-2 font-medium">Mentor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.slice(0, 25).map((s) => (
                <tr key={s.id}>
                  <td className="py-1.5 text-gray-800">{s.name}</td>
                  <td className="py-1.5 text-gray-600">{s.programme}</td>
                  <td className="py-1.5 text-gray-600">
                    <Link
                      to={`/admin/student/${s.mentor_id ?? 'none'}`}
                      className="text-ums-blue hover:underline"
                    >
                      {s.mentor_id
                        ? lecturers.find((l) => l.id === s.mentor_id)?.name ?? '—'
                        : '—'}
                    </Link>
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
