import { useState, useMemo, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import * as adminService from '@/services/adminService'
import { queryKeys } from '@/lib/queryKeys'

type Programme = 'UH0010001' | 'UH0010002' | 'UH0010003' | 'UH0010004' | 'all'
type SummaryView = 'students' | 'lecturers' | 'admins' | 'unassigned'
type SortField = 'name' | 'matric'
type SortDirection = 'asc' | 'desc'
type ImportMatch = {
  row: number
  student: adminService.UserRow | null
  mentor: adminService.UserRow | null
  matricValue: string
  studentValue: string
  mentorValue: string
  confidence: number
}

const PROGRAMMES: Programme[] = [
  'all',
  'UH0010001',
  'UH0010002',
  'UH0010003',
  'UH0010004',
]
const PROGRAMME_LABELS: Record<Programme, string> = {
  all: 'All programmes',
  UH0010001: 'UH0010001 · Asasi Sains · Foundation in Science',
  UH0010002: 'UH0010002 · Asasi Teknologi Maklumat · Foundation in Information Technology',
  UH0010003: 'UH0010003 · Asasi Agrisains · Foundation in Agricultural Science',
  UH0010004: 'UH0010004 · Asasi Sains Sosial · Foundation in Social Science',
}

function normalize(value: string | null | undefined) {
  return (value ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
}

function similarity(left: string, right: string) {
  if (!left || !right) return 0
  if (left === right) return 1
  if (left.includes(right) || right.includes(left)) return 0.88
  const matrix = Array.from({ length: left.length + 1 }, (_, row) =>
    Array.from({ length: right.length + 1 }, (_, column) => row === 0 ? column : column === 0 ? row : 0),
  )
  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
      )
    }
  }
  return 1 - matrix[left.length][right.length] / Math.max(left.length, right.length)
}

function bestMatch(value: string, candidates: adminService.UserRow[]) {
  const target = normalize(value)
  if (!target) return { mentor: null, confidence: 0 }
  const ranked = candidates
    .map((candidate) => ({ mentor: candidate, confidence: similarity(target, normalize(candidate.name)) }))
    .sort((left, right) => right.confidence - left.confidence)
  return ranked[0] ?? { mentor: null, confidence: 0 }
}

export default function AssignmentPage() {
  const [programme, setProgramme] = useState<Programme>('all')
  const [search, setSearch] = useState('')
  const [summaryView, setSummaryView] = useState<SummaryView>('students')
  const [mentorFilter, setMentorFilter] = useState<'all' | 'assigned' | 'unassigned'>('all')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const pageSize = 50
  const [error, setError] = useState<string | null>(null)
  const [importMatches, setImportMatches] = useState<ImportMatch[]>([])
  const [importingFile, setImportingFile] = useState(false)
  const [assignmentProgress, setAssignmentProgress] = useState({ current: 0, total: 0, assigned: 0, failed: 0 })
  const [assignmentHeaders, setAssignmentHeaders] = useState<string[]>([])
  const [assignmentRows, setAssignmentRows] = useState<Record<string, unknown>[]>([])
  const [assignmentMapping, setAssignmentMapping] = useState({
    matric: '',
    mentor: '',
  })

  const {
    data: students = [],
    isLoading: studentsLoading,
  } = useQuery({
    queryKey: queryKeys.admin.students(programme === 'all' ? undefined : programme),
    queryFn: () =>
      adminService.getStudentsByProgramme(programme === 'all' ? undefined : programme),
  })
  const { data: allStudents = [], isLoading: allStudentsLoading } = useQuery({
    queryKey: queryKeys.admin.students(),
    queryFn: () => adminService.getStudentsByProgramme(),
  })
  const { data: allUsers = [], isLoading: allUsersLoading } = useQuery({
    queryKey: queryKeys.users.all(),
    queryFn: adminService.listAllUsers,
  })
  const {
    data: mentors = [],
    isLoading: mentorsLoading,
  } = useQuery({
    queryKey: queryKeys.admin.mentors(),
    queryFn: adminService.getAvailableMentors,
  })
  const qc = useQueryClient()
  const assign = useMutation({
    mutationFn: ({ ids, mentorId }: { ids: string[]; mentorId: string | null }) =>
    adminService.bulkAssignMentors(ids, mentorId),
    onSuccess: () => {
    setSelectedIds(new Set())
    setError(null)
    qc.invalidateQueries({ queryKey: queryKeys.users.all() })
    qc.invalidateQueries({ queryKey: queryKeys.admin.all })
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Unable to reassign mentors.'),
  })
  const autoAssign = useMutation({
    mutationFn: () =>
    adminService.autoAssignMentors(Array.from(selectedIds)),
    onSuccess: () => {
    setSelectedIds(new Set())
    setError(null)
    qc.invalidateQueries({ queryKey: queryKeys.users.all() })
    qc.invalidateQueries({ queryKey: queryKeys.admin.all })
    qc.invalidateQueries({ queryKey: queryKeys.admin.students(programme === 'all' ? undefined : programme) })
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Unable to auto-assign mentors.'),
  })
  const importAssignments = useMutation({
    mutationFn: async () => {
      const validMatches = importMatches.filter((match) => match.student && match.mentor && match.confidence >= 0.55)
      setAssignmentProgress({ current: 0, total: validMatches.length, assigned: 0, failed: 0 })
      let assigned = 0
      let failed = 0
      for (const match of validMatches) {
        try {
          await adminService.bulkAssignMentors([match.student!.id], match.mentor!.id)
          assigned += 1
        } catch {
          failed += 1
        }
        setAssignmentProgress({ current: assigned + failed, total: validMatches.length, assigned, failed })
      }
      return { assigned, failed }
    },
    onSuccess: ({ assigned, failed }) => {
      setError(failed ? `${assigned} assignments applied; ${failed} existing student assignment${failed === 1 ? '' : 's'} failed.` : null)
      qc.invalidateQueries({ queryKey: queryKeys.users.all() })
      qc.invalidateQueries({ queryKey: queryKeys.admin.all })
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Unable to import mentor assignments.'),
  })

  async function readAssignmentFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setImportingFile(true)
    setError(null)
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
      const headers = records.length ? Object.keys(records[0]) : []
      const findHeader = (aliases: string[]) => headers.find((header) => aliases.includes(normalize(header))) ?? ''
      const nextMapping = {
        matric: findHeader(['nomatrik', 'matricnumber', 'matric', 'studentid']),
        mentor: findHeader(['mentor', 'mentname', 'mentorname', 'namamentor', 'lecturer']),
      }
      if (!nextMapping.matric || !nextMapping.mentor) {
        throw new Error('The spreadsheet must contain both a No. MATRIK column and a NAMA MENTOR column.')
      }
      setAssignmentHeaders(headers)
      setAssignmentRows(records)
      setAssignmentMapping(nextMapping)
      setImportMatches([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to read assignment spreadsheet.')
    } finally {
      setImportingFile(false)
      event.target.value = ''
    }
  }

  function previewAssignments() {
    if (!assignmentMapping.matric || !assignmentMapping.mentor) {
      setError('Select both the No. MATRIK and NAMA MENTOR columns before previewing.')
      return
    }
    if (!assignmentRows.length) {
      setError('Select an assignment spreadsheet before previewing.')
      return
    }
    const matches = assignmentRows.map((record, index) => {
        const matricValue = assignmentMapping.matric ? String(record[assignmentMapping.matric] ?? '').trim() : ''
        const mentorValue = String(record[assignmentMapping.mentor] ?? '').trim()
        const studentValue = matricValue
        const student = allStudents.find((candidate) =>
          candidate.matric_number && normalize(candidate.matric_number) === normalize(matricValue),
        ) ?? null
        const mentorResult = bestMatch(mentorValue, mentors)
        return {
          row: index + 2,
          student,
          mentor: mentorResult.mentor,
          matricValue,
          studentValue,
          mentorValue,
          confidence: student ? mentorResult.confidence : 0,
        }
    })
    setImportMatches(matches)
    setError(null)
  }
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const mentorFiltered = mentorFilter === 'all'
      ? students
      : students.filter((student) => mentorFilter === 'unassigned' ? !student.mentor_id : Boolean(student.mentor_id))
    const searched = !q ? mentorFiltered : mentorFiltered.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.matric_number ?? '').toLowerCase().includes(q) ||
        (s.email ?? '').toLowerCase().includes(q),
    )
    return [...searched].sort((left, right) => {
      const leftValue = sortField === 'name' ? left.name : (left.matric_number ?? '')
      const rightValue = sortField === 'name' ? right.name : (right.matric_number ?? '')
      const result = leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: 'base' })
      return sortDirection === 'asc' ? result : -result
    })
  }, [students, search, mentorFilter, sortDirection, sortField])

  const pageStudents = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page],
  )

  if (studentsLoading || mentorsLoading || allStudentsLoading || allUsersLoading) {
    return <p className="text-sm text-gray-500">Loading…</p>
  }

  const toggle = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const isAllSelected =
    filtered.length > 0 && filtered.every((s) => selectedIds.has(s.id))

  const unassignedCount = allStudents.filter((s) => !s.mentor_id).length
  const lecturerUsers = allUsers.filter((user) => user.role === 'lecturer')
  const adminUsers = allUsers.filter((user) => user.role === 'admin')
  const setSort = (field: SortField) => {
    if (sortField === field) setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc')
    else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-gray-900">Assignment</h1>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {([
          ['students', 'Students', allStudents.length, 'View all students'],
          ['lecturers', 'Lecturers', lecturerUsers.length, 'View all lecturers'],
          ['admins', 'Administrators', adminUsers.length, 'View all administrators'],
          ['unassigned', 'Unassigned students', unassignedCount, 'View unassigned students'],
        ] as const).map(([view, label, count, help]) => (
          <button
            key={view}
            type="button"
            onClick={() => {
              setSummaryView(view)
              if (view === 'unassigned') setMentorFilter('unassigned')
              else if (view === 'students') setMentorFilter('all')
            }}
            className={`rounded-lg border p-4 text-left shadow-sm transition ${summaryView === view ? 'border-ums-blue bg-blue-50 ring-1 ring-ums-blue' : 'border-gray-200 bg-white hover:border-blue-300'}`}
          >
            <span className="block text-xs font-medium text-gray-500">{label}</span>
            <span className="mt-1 block text-2xl font-semibold text-gray-900">{count}</span>
            <span className="mt-1 block text-xs text-gray-500">{help}</span>
          </button>
        ))}
      </div>
      {(summaryView === 'lecturers' || summaryView === 'admins') && (
        <div className="mb-4 overflow-x-auto rounded-lg bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 text-xs text-gray-400">
              <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(summaryView === 'lecturers' ? lecturerUsers : adminUsers).map((user) => (
                <tr key={user.id}>
                  <td className="p-3 font-medium">
                    {user.role === 'lecturer' ? (
                      <Link to={`/admin/lecturer/${user.id}`} className="text-ums-blue hover:underline">{user.name}</Link>
                    ) : user.name}
                  </td>
                  <td className="p-3 text-gray-600">{user.email ?? '—'}</td>
                  <td className="p-3 capitalize text-gray-600">{user.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mb-4 flex flex-wrap gap-2">
        {PROGRAMMES.map((p) => (
          <button
            key={p}
            onClick={() => {
              setProgramme(p)
              setPage(1)
              setSelectedIds(new Set())
              setSummaryView('students')
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${programme === p ? 'bg-ums-blue text-white' : 'bg-white text-gray-700'}`}
          >
            {PROGRAMME_LABELS[p]}
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
        <div className="flex flex-wrap gap-2 text-sm">
          {([
            ['all', 'All mentors'],
            ['unassigned', 'Unassigned mentor'],
            ['assigned', 'Assigned mentor'],
          ] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => { setMentorFilter(value); setSummaryView(value === 'unassigned' ? 'unassigned' : 'students') }} className={`rounded-full border px-3 py-1 ${mentorFilter === value ? 'border-ums-blue bg-blue-50 text-ums-blue' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="text-sm text-gray-600">{filtered.length} students · {unassignedCount} unassigned</div>

        <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
          <h2 className="text-sm font-semibold text-blue-900">Import student–mentor assignments</h2>
          <p className="mt-1 text-xs text-blue-800">Upload Excel with No. MATRIK and NAMA MENTOR columns. Students must already exist and are matched strictly by matric number. Mentor names use smart matching against existing lecturers; no accounts are created.</p>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={readAssignmentFile} disabled={importingFile} className="mt-3 block text-sm" />
          {assignmentHeaders.length > 0 && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {([
                  ['matric', 'NO. MATRIK column', 'Required; must match an existing student'],
                  ['mentor', 'NAMA MENTOR column', 'Required; matched to an existing lecturer'],
              ] as const).map(([field, label, help]) => (
                  <label key={field} className="text-xs font-medium text-blue-900">
                    {label}
                    <select
                      className="mt-1 w-full rounded border border-blue-200 bg-white px-2 py-1.5 text-sm text-gray-700"
                      value={assignmentMapping[field]}
                      onChange={(event) => setAssignmentMapping((previous) => ({ ...previous, [field]: event.target.value }))}
                    >
                      <option value="">Do not import</option>
                      {assignmentHeaders.map((header) => <option key={header} value={header}>{header}</option>)}
                    </select>
                    <span className="font-normal text-blue-700">{help}</span>
                  </label>
              ))}
              <button type="button" onClick={previewAssignments} className="rounded bg-ums-blue px-3 py-2 text-sm font-medium text-white sm:col-span-2">
                  Preview assignments
              </button>
            </div>
          )}
          {importMatches.length > 0 && (
            <div className="mt-3 space-y-3">
              <div className="max-h-96 overflow-auto rounded bg-white">
                  <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 border-b bg-white"><tr><th className="p-2">Row</th><th className="p-2">NO. MATRIK</th><th className="p-2">Existing student</th><th className="p-2">NAMA MENTOR</th><th className="p-2">Existing lecturer</th><th className="p-2">Confidence</th></tr></thead>
                  <tbody className="divide-y">
                    {importMatches.slice(0, 100).map((match) => (
                      <tr key={match.row} className={match.student && match.mentor && match.confidence >= 0.55 ? '' : 'bg-red-50'}>
                          <td className="p-2">{match.row}</td><td className="p-2">{match.matricValue || '—'}</td><td className="p-2">{match.student?.name ?? 'Not found — existing student required'}</td><td className="p-2">{match.mentorValue || '—'}</td><td className="p-2">{match.mentor?.name ?? 'Not found'}</td><td className="p-2">{Math.round(match.confidence * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" disabled={importAssignments.isPending || !importMatches.some((match) => match.student && match.mentor && match.confidence >= 0.55)} onClick={() => importAssignments.mutate()} className="rounded bg-ums-blue px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                {importAssignments.isPending ? 'Assigning…' : `Apply ${importMatches.filter((match) => match.student && match.mentor && match.confidence >= 0.55).length} detected assignments`}
              </button>
              {importAssignments.isPending && (
                <div className="rounded border border-blue-100 bg-white p-3 text-xs text-blue-900">
                  <div className="mb-2 flex justify-between">
                    <span>Assigning existing students</span>
                    <span>{assignmentProgress.current} / {assignmentProgress.total} · {assignmentProgress.failed} failed</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-blue-100">
                    <div className="h-full rounded-full bg-ums-blue transition-all" style={{ width: `${assignmentProgress.total ? (assignmentProgress.current / assignmentProgress.total) * 100 : 0}%` }} />
                  </div>
                </div>
              )}
              {importMatches.length > 100 && <p className="text-xs text-blue-800">Showing the first 100 rows. All valid rows will be applied.</p>}
            </div>
          )}
        </div>
        <button
          disabled={autoAssign.isPending || selectedIds.size === 0}
          onClick={() => autoAssign.mutate()}
          className="rounded bg-ums-blue px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {autoAssign.isPending ? 'Assigning…' : 'Auto-assign selected'}
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
                  <th className="py-2 font-medium"><button type="button" onClick={() => setSort('name')} className="hover:text-ums-blue">Name {sortField === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}</button></th>
                  <th className="py-2 font-medium"><button type="button" onClick={() => setSort('matric')} className="hover:text-ums-blue">Matric {sortField === 'matric' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}</button></th>
                  <th className="py-2 font-medium">Programme</th>
                  <th className="py-2 font-medium">Mentor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageStudents.map((s) => {
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
                      <td className="py-2 text-gray-600">{s.matric_number ?? '—'}</td>
                      <td className="py-2 text-gray-600">{s.programme}</td>
                      <td className="py-2 text-gray-600">
                        {mentor ? (
                          <Link to={`/admin/lecturer/${mentor.id}`} className="text-ums-blue hover:underline">
                            {mentor.name}
                          </Link>
                        ) : (
                          <span className="font-medium text-red-600">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {pageStudents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-3 text-sm text-gray-400">
                      No students match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filtered.length > pageSize && (
            <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
              <span>
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of{' '}
                {filtered.length}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded bg-gray-50 px-2 py-1 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  disabled={page * pageSize >= filtered.length}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded bg-gray-50 px-2 py-1 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-gray-500">Assign selected ({selectedIds.size})</h3>
          <select
            className="mb-2 w-full rounded-md border border-gray-200 p-2 text-sm"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value && selectedIds.size) {
                assign.mutate({
                  ids: Array.from(selectedIds),
                  mentorId: e.target.value === '__null__' ? null : e.target.value,
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
