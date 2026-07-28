import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as adminService from '@/services/adminService'
import { queryKeys } from '@/lib/queryKeys'

type Programme = 'Asasi Sains' | 'Asasi Teknologi' | 'Asasi Agrisains' | 'Asasi Sains Sosial' | 'all'

const PROGRAMMES: Programme[] = [
  'all',
  'Asasi Sains',
  'Asasi Teknologi',
  'Asasi Agrisains',
  'Asasi Sains Sosial',
]

export default function AssignmentPage() {
  const [programme, setProgramme] = useState<Programme>('all')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: queryKeys.admin.students(programme === 'all' ? undefined : programme),
    queryFn: () =>
      adminService.getStudentsByProgramme(programme === 'all' ? undefined : programme),
  })
  const { data: mentors = [], isLoading: mentorsLoading } =
    useQuery(adminService.getAvailableMentors())
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return students
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.matric_number ?? '').toLowerCase().includes(q) ||
        (s.email ?? '').toLowerCase().includes(q),
    )
  }, [students, search])

  const qc = useQueryClient()
  const assign = useMutation({
    mutationFn: ({ ids, mentorId }: { ids: string[]; mentorId: string | null }) =>
      adminService.bulkAssignMentors(ids, mentorId),
    onSuccess: () => {
      setSelectedIds(new Set())
      qc.invalidateQueries({ queryKey: queryKeys.admin.all })
    },
  })
  const autoAssign = useMutation({
    mutationFn: () =>
      adminService.autoAssignMentors(
        programme === 'all' ? undefined : { programme },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.all })
    },
  })

  const toggle = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const isAllSelected =
    filtered.length > 0 && filtered.every((s) => selectedIds.has(s.id))

  const unassignedCount = students.filter((s) => !s.mentor_id).length

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-gray-900">Assignment</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {PROGRAMMES.map((p) => (
          <button
            key={p}
            onClick={() => {
              setProgramme(p)
              setSelectedIds(new Set())
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${programme === p ? 'bg-ums-blue text-white' : 'bg-white text-gray-700'}`}
          >
            {p === 'all' ? 'All programmes' : p}
          </button>
        ))}
        <input
          className="ml-auto rounded-md border border-gray-200 px-3 py-1.5 text-sm"
          placeholder="Search student…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-gray-600">
          {filtered.length} students · {unassignedCount} unassigned
        </div>
        <button
          disabled={autoAssign.isPending}
          onClick={() => autoAssign.mutate()}
          className="rounded bg-ums-blue px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Auto-assign unassigned
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100">
                <tr className="text-xs text-gray-400">
                  <th className="py-2 pl-3 font-medium">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => {
                        const next = new Set<string>()
                        if (e.target.checked)
                          filtered.forEach((s) => next.add(s.id))
                        setSelectedIds(next)
                      }}
                    />
                  </th>
                  <th className="py-2 font-medium">Name</th>
                  <th className="py-2 font-medium">Matric</th>
                  <th className="py-2 font-medium">Programme</th>
                  <th className="py-2 font-medium">Mentor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((s) => {
                  const mentor = mentors.find((m) => m.id === s.mentor_id)
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="py-2 pl-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(s.id)}
                          onChange={() => toggle(s.id)}
                        />
                      </td>
                      <td className="py-2 text-gray-800">{s.name}</td>
                      <td className="py-2 text-gray-600">
                        {s.matric_number ?? '—'}
                      </td>
                      <td className="py-2 text-gray-600">{s.programme}</td>
                      <td className="py-2 text-gray-600">
                        {mentor ? (
                          <Link
                            to={`/admin/lecturer/${mentor.id}`}
                            className="text-ums-blue hover:underline"
                          >
                            {mentor.name}
                          </Link>
                        ) : (
                          <span className="font-medium text-red-600">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-3 text-sm text-gray-400">
                      No students match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-gray-500">
            Assign selected ({selectedIds.size})
          </h3>
          <select
            className="mb-2 w-full rounded-md border border-gray-200 p-2 text-sm"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value && selectedIds.size) {
                assign.mutate({
                  ids: Array.from(selectedIds),
                  mentorId: e.target.value,
                })
                e.target.value = ''
              }
            }}
          >
            <option value="" disabled>
              Select mentor…
            </option>
            {mentors.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.matric_number})
              </option>
            ))}
            <option value="__null__">Unassigned</option>
          </select>
          <p className="text-xs text-gray-500">
            Or click a student name in the left table to inspect their mentor.
          </p>
        </div>
      </div>
    </div>
  )
}
