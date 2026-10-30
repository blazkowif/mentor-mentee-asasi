import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { useAuthStore } from '@/features/auth/authStore'
import * as adminService from '@/services/adminService'
import * as taskService from '@/services/taskService'
import * as announcementService from '@/services/announcementService'
import { queryKeys } from '@/lib/queryKeys'
import type { Database } from '@/types/database.types'
import { studentAuthEmail } from '@/services/authService'
import AssignmentPage from './AssignmentPage'
import LoadingButton from '@/components/LoadingButton'

type Role = Database['public']['Enums']['user_role']
type ImportField =
  | 'matric_number' | 'ic_number' | 'name' | 'email' | 'gender' | 'religion' | 'race'
  | 'phone' | 'programme' | 'channel' | 'address' | 'postcode' | 'city' | 'state'
  | 'study_status' | 'mentor'
type UserForm = {
  name: string
  role: Role
  email: string
  password: string
  matric_number: string
  ic_number: string
  gender: string
  religion: string
  race: string
  programme: string
  phone: string
  channel: string
  address: string
  postcode: string
  city: string
  state: string
  study_status: string
  motto: string
}

const emptyForm: UserForm = {
  name: '',
  role: 'student',
  email: '',
  password: '',
  matric_number: '',
  ic_number: '',
  gender: '',
  religion: '',
  race: '',
  programme: '',
  phone: '',
  channel: '',
  address: '',
  postcode: '',
  city: '',
  state: '',
  study_status: '',
  motto: '',
}
const importFields: ImportField[] = [
  'matric_number', 'ic_number', 'name', 'email', 'gender', 'religion', 'race', 'phone',
  'programme', 'channel', 'address', 'postcode', 'city', 'state', 'study_status', 'mentor',
]
const DELETE_STUDENTS_PHRASE = 'I-hereby-ending-this-session'
const DELETE_MENTORS_PHRASE = 'I-hereby-ending-all-mentor-accounts'

export default function AdminControlPage() {
  const currentUser = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab')
  const [tab, setTab] = useState<'users' | 'assignment' | 'import' | 'content' | 'lists'>(
    initialTab === 'assignment' || initialTab === 'import' || initialTab === 'content' || initialTab === 'lists' ? initialTab : 'users',
  )
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteStudents, setShowDeleteStudents] = useState(false)
  const [deleteStudentsPhrase, setDeleteStudentsPhrase] = useState('')
  const [showDeleteMentors, setShowDeleteMentors] = useState(false)
  const [deleteMentorsPhrase, setDeleteMentorsPhrase] = useState('')
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState({ current: 0, total: 0, deleted: 0, failed: 0, type: '' })

  const usersQuery = useQuery({
    queryKey: queryKeys.users.all(),
    queryFn: adminService.listAllUsers,
  })
  const tasksQuery = useQuery({ queryKey: ['admin', 'tasks'], queryFn: adminService.listAllTasks, enabled: tab === 'content' })
  const announcementsQuery = useQuery({
    queryKey: ['admin', 'announcements'],
    queryFn: adminService.listAllAnnouncements,
    enabled: tab === 'content',
  })
  const users = usersQuery.data ?? []
  const studentCount = users.filter((user) => user.role === 'student').length
  const mentorCount = users.filter((user) => user.role === 'lecturer').length
  const adminCount = users.filter((user) => user.role === 'admin').length
  const unassignedStudentCount = users.filter((user) => user.role === 'student' && !user.mentor_id).length
  const students = users.filter((user) => user.role === 'student')
  const mentors = users.filter((user) => user.role === 'lecturer')
  const mentees = students.filter((student) => student.mentor_id)
  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return users
    return users.filter((user) =>
      [user.name, user.email, user.matric_number, user.role].some((value) =>
        value?.toLowerCase().includes(term),
      ),
    )
  }, [search, users])

  const saveUser = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        role: form.role,
        email: form.role === 'student' ? undefined : form.email.trim(),
        password: form.password || undefined,
        matric_number: form.matric_number.trim() || undefined,
        ic_number: form.ic_number.trim() || undefined,
        gender: form.gender.trim() || undefined,
        religion: form.religion.trim() || undefined,
        race: form.race.trim() || undefined,
        programme: form.programme.trim() || undefined,
        phone: form.phone.trim() || undefined,
        channel: form.channel.trim() || undefined,
        address: form.address.trim() || undefined,
        postcode: form.postcode.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        study_status: form.study_status.trim() || undefined,
        motto: form.motto.trim() || undefined,
      }
      return editingId
        ? adminService.updateManagedUser(editingId, payload)
        : adminService.createManagedUser({ ...payload, password: form.password })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() })
      setForm(emptyForm)
      setEditingId(null)
      setMessage(editingId ? 'User updated.' : 'User created.')
      setError(null)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Unable to save user.'),
  })
  const deleteUser = useMutation({
    mutationFn: adminService.deleteManagedUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() })
      setMessage('User deleted.')
      setError(null)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Unable to delete user.'),
  })
  const deleteAllStudents = useMutation({
    mutationFn: () => {
      const students = users.filter((user) => user.role === 'student')
      setBulkDeleteProgress({ current: 0, total: students.length, deleted: 0, failed: 0, type: 'students' })
      return adminService.deleteManagedUsers(
        students,
        deleteStudentsPhrase,
        (progress) => setBulkDeleteProgress({ ...progress, type: 'students' }),
      )
    },
    onSuccess: ({ deleted, failed }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() })
      setDeleteStudentsPhrase('')
      setShowDeleteStudents(false)
      setMessage(`${deleted} student account${deleted === 1 ? '' : 's'} deleted${failed ? `; ${failed} failed` : ''}.`)
      setError(null)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Unable to delete all students.'),
  })
  const deleteAllMentors = useMutation({
    mutationFn: () => {
      const mentors = users.filter((user) => user.role === 'lecturer')
      setBulkDeleteProgress({ current: 0, total: mentors.length, deleted: 0, failed: 0, type: 'mentors' })
      return adminService.deleteManagedUsers(
        mentors,
        deleteMentorsPhrase,
        (progress) => setBulkDeleteProgress({ ...progress, type: 'mentors' }),
      )
    },
    onSuccess: ({ deleted, failed }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() })
      setDeleteMentorsPhrase('')
      setShowDeleteMentors(false)
      setMessage(`${deleted} mentor account${deleted === 1 ? '' : 's'} deleted${failed ? `; ${failed} failed` : ''}.`)
      setError(null)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Unable to delete all mentors.'),
  })

  function updateForm(field: keyof UserForm, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  function editUser(user: adminService.UserRow) {
    setEditingId(user.id)
    setForm({
      name: user.name,
      role: user.role,
      email: user.email ?? '',
      password: '',
      matric_number: user.matric_number ?? '',
      ic_number: user.ic_number ?? '',
      gender: user.gender ?? '',
      religion: user.religion ?? '',
      race: user.race ?? '',
      programme: user.programme ?? '',
      phone: user.phone ?? '',
      channel: user.channel ?? '',
      address: user.address ?? '',
      postcode: user.postcode ?? '',
      city: user.city ?? '',
      state: user.state ?? '',
      study_status: user.study_status ?? '',
      motto: user.motto ?? '',
    })
    setTab('users')
  }

  function submitUser(event: FormEvent) {
    event.preventDefault()
    setMessage(null)
    setError(null)
    saveUser.mutate()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500">Manage accounts, assignments, tasks, and announcements from one place.</p>
      </div>
      <nav className="flex flex-wrap gap-2 border-b border-gray-200">
        {([
          ['users', 'Users & passwords'],
          ['assignment', 'Reassign mentors'],
          ['import', 'Excel import'],
          ['content', 'Tasks & announcements'],
          ['lists', 'Mentor & Mentee List'],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-3 py-2 text-sm font-medium ${tab === key ? 'border-b-2 border-ums-blue text-ums-blue' : 'text-gray-600'}`}>
            {label}
          </button>
        ))}
      </nav>
      {message && <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>}
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {usersQuery.isError && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          Could not load users: {usersQuery.error instanceof Error ? usersQuery.error.message : 'Supabase returned an unknown error.'}
          Check that the logged-in profile exists in public.users and has role admin.
        </p>
      )}
      {!usersQuery.isError && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatisticCard label="Students" value={studentCount} />
          <StatisticCard label="Lecturers" value={mentorCount} />
          <StatisticCard label="Administrators" value={adminCount} />
          <StatisticCard label="Unassigned students" value={unassignedStudentCount} warning={unassignedStudentCount > 0} />
        </section>
      )}
      {tab === 'users' && (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="mb-4 flex gap-2">
              <input className="w-full rounded border border-gray-300 px-3 py-2 text-sm" placeholder="Search name, email, matric or staff ID" value={search} onChange={(event) => setSearch(event.target.value)} />
              <button className="whitespace-nowrap rounded bg-gray-100 px-3 text-sm" onClick={() => { setEditingId(null); setForm(emptyForm) }}>New user</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b text-xs text-gray-500"><th className="p-2">Name</th><th className="p-2">Role</th><th className="p-2">Login</th><th className="p-2">Actions</th></tr></thead>
                <tbody className="divide-y">
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="p-2"><p className="font-medium">{user.name}</p><p className="text-xs text-gray-500">{user.matric_number ?? '—'}</p></td>
                      <td className="p-2 capitalize">{user.role}</td>
                      <td className="p-2 text-xs">{user.role === 'student' ? (user.matric_number ?? '—') : (user.email ?? '—')}</td>
                      <td className="p-2"><div className="flex gap-2"><button className="text-ums-blue hover:underline" onClick={() => editUser(user)}>Edit</button><LoadingButton className="text-red-600 hover:underline" loading={deletingUserId === user.id} loadingLabel="Deleting…" disabled={user.id === currentUser?.id} onClick={() => { if (window.confirm(`Delete ${user.name}?`)) { setDeletingUserId(user.id); deleteUser.mutate(user.id, { onSettled: () => setDeletingUserId(null) }) } }}>Delete</LoadingButton></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!usersQuery.isLoading && filteredUsers.length === 0 && <p className="py-6 text-sm text-gray-500">No matching users.</p>}
            </div>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm">
            <h2 className="font-semibold text-red-800">Danger zone</h2>
            <p className="mt-1 text-sm text-red-700">
              Delete every student account and their related data. Lecturers and administrators are not affected.
            </p>
            {!showDeleteStudents ? (
              <button
                type="button"
                onClick={() => setShowDeleteStudents(true)}
                disabled={usersQuery.isLoading || users.filter((user) => user.role === 'student').length === 0}
                className="mt-3 rounded border border-red-300 px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-50"
              >
                {deleteAllStudents.isPending ? `Deleting ${studentCount} students…` : `Delete all students (${studentCount})`}
              </button>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-red-800">
                  Type exactly: <code>{DELETE_STUDENTS_PHRASE}</code>
                </p>
                <input
                  className="w-full rounded border border-red-300 bg-white px-3 py-2 text-sm"
                  value={deleteStudentsPhrase}
                  onChange={(event) => setDeleteStudentsPhrase(event.target.value)}
                  placeholder={DELETE_STUDENTS_PHRASE}
                  autoComplete="off"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setShowDeleteStudents(false); setDeleteStudentsPhrase('') }} className="rounded px-3 py-2 text-sm text-gray-700">
                    Cancel
                  </button>
                  <LoadingButton
                    type="button"
                    loading={deleteAllStudents.isPending}
                    loadingLabel="Deleting students…"
                    disabled={deleteStudentsPhrase !== DELETE_STUDENTS_PHRASE}
                    onClick={() => deleteAllStudents.mutate()}
                    className="rounded bg-red-700 px-3 py-2 text-sm font-medium text-white"
                  >
                    Confirm permanent deletion
                  </LoadingButton>
                  {deleteAllStudents.isPending && (
                    <div className="min-w-40 flex-1">
                      <p className="mb-1 text-xs text-red-800">{bulkDeleteProgress.current} of {bulkDeleteProgress.total} students processed · {bulkDeleteProgress.deleted} deleted · {bulkDeleteProgress.failed} failed</p>
                      <div className="h-1.5 overflow-hidden rounded-full bg-red-100"><div className="h-full rounded-full bg-red-700 transition-all" style={{ width: `${bulkDeleteProgress.total ? (bulkDeleteProgress.current / bulkDeleteProgress.total) * 100 : 0}%` }} /></div>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="mt-5 border-t border-red-200 pt-4">
              <p className="text-sm text-red-700">
                Delete every lecturer/mentor account. Assigned students will become unassigned, and mentor chat/group data may be removed by database cascades.
              </p>
              {!showDeleteMentors ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteMentors(true)}
                  disabled={usersQuery.isLoading || users.filter((user) => user.role === 'lecturer').length === 0}
                  className="mt-3 rounded border border-red-300 px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-50"
                >
                  {deleteAllMentors.isPending ? `Deleting ${mentorCount} mentors…` : `Delete all mentors (${mentorCount})`}
                </button>
              ) : (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-red-800">
                    Type exactly: <code>{DELETE_MENTORS_PHRASE}</code>
                  </p>
                  <input
                    className="w-full rounded border border-red-300 bg-white px-3 py-2 text-sm"
                    value={deleteMentorsPhrase}
                    onChange={(event) => setDeleteMentorsPhrase(event.target.value)}
                    placeholder={DELETE_MENTORS_PHRASE}
                    autoComplete="off"
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setShowDeleteMentors(false); setDeleteMentorsPhrase('') }} className="rounded px-3 py-2 text-sm text-gray-700">
                      Cancel
                    </button>
                    <LoadingButton
                      type="button"
                      loading={deleteAllMentors.isPending}
                      loadingLabel="Deleting mentors…"
                      disabled={deleteMentorsPhrase !== DELETE_MENTORS_PHRASE}
                      onClick={() => deleteAllMentors.mutate()}
                      className="rounded bg-red-700 px-3 py-2 text-sm font-medium text-white"
                    >
                      Confirm permanent deletion
                    </LoadingButton>
                    {deleteAllMentors.isPending && (
                      <div className="min-w-40 flex-1">
                        <p className="mb-1 text-xs text-red-800">{bulkDeleteProgress.current} of {bulkDeleteProgress.total} mentors processed · {bulkDeleteProgress.deleted} deleted · {bulkDeleteProgress.failed} failed</p>
                        <div className="h-1.5 overflow-hidden rounded-full bg-red-100"><div className="h-full rounded-full bg-red-700 transition-all" style={{ width: `${bulkDeleteProgress.total ? (bulkDeleteProgress.current / bulkDeleteProgress.total) * 100 : 0}%` }} /></div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <form onSubmit={submitUser} className="rounded-lg bg-white p-4 shadow-sm">
            <h2 className="mb-3 font-semibold">{editingId ? 'Edit user' : 'Add user'}</h2>
            <div className="space-y-3">
              <label className="block text-xs font-medium text-gray-600">Full name<input required className="mt-1 w-full rounded border px-3 py-2 text-sm" value={form.name} onChange={(event) => updateForm('name', event.target.value)} /></label>
              <label className="block text-xs font-medium text-gray-600">Role<select className="mt-1 w-full rounded border px-3 py-2 text-sm" value={form.role} onChange={(event) => updateForm('role', event.target.value)}><option value="student">Student</option><option value="lecturer">Lecturer</option><option value="admin">Admin</option></select></label>
              {form.role === 'student' ? (
                <p className="rounded bg-blue-50 px-3 py-2 text-xs text-blue-800">
                  Student login ID: <strong>{form.matric_number || 'enter the matric number below'}</strong>. Students do not use an email address to log in.
                </p>
              ) : (
                <label className="block text-xs font-medium text-gray-600">Email / login email<input required type="email" className="mt-1 w-full rounded border px-3 py-2 text-sm" value={form.email} onChange={(event) => updateForm('email', event.target.value)} /></label>
              )}
              <label className="block text-xs font-medium text-gray-600">{editingId ? 'New password (leave blank to keep current)' : 'Password'}<input required={!editingId} minLength={8} type="password" className="mt-1 w-full rounded border px-3 py-2 text-sm" value={form.password} onChange={(event) => updateForm('password', event.target.value)} /></label>
              <label className="block text-xs font-medium text-gray-600">Matric / staff ID<input className="mt-1 w-full rounded border px-3 py-2 text-sm" value={form.matric_number} onChange={(event) => updateForm('matric_number', event.target.value)} /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  ['ic_number', 'KP / IC number'],
                  ['gender', 'Gender'],
                  ['religion', 'Religion'],
                  ['race', 'Race'],
                  ['programme', 'Programme'],
                  ['phone', 'Phone'],
                  ['channel', 'Channel'],
                  ['study_status', 'Study status'],
                  ['postcode', 'Postcode'],
                  ['city', 'City'],
                  ['state', 'State'],
                ] as const).map(([field, label]) => (
                  <label key={field} className="block text-xs font-medium text-gray-600">
                    {label}
                    <input className="mt-1 w-full rounded border px-3 py-2 text-sm" value={form[field]} onChange={(event) => updateForm(field, event.target.value)} />
                  </label>
                ))}
              </div>
              <label className="block text-xs font-medium text-gray-600">Address<textarea className="mt-1 min-h-20 w-full rounded border px-3 py-2 text-sm" value={form.address} onChange={(event) => updateForm('address', event.target.value)} /></label>
              <label className="block text-xs font-medium text-gray-600">Motto<input className="mt-1 w-full rounded border px-3 py-2 text-sm" value={form.motto} onChange={(event) => updateForm('motto', event.target.value)} /></label>
            </div>
            <button disabled={saveUser.isPending} className="mt-4 w-full rounded bg-ums-blue px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{saveUser.isPending ? 'Saving…' : editingId ? 'Save changes' : 'Create user'}</button>
          </form>
        </section>
      )}

      {tab === 'import' && <SpreadsheetImport onComplete={() => queryClient.invalidateQueries({ queryKey: queryKeys.users.all() })} onMessage={setMessage} onError={setError} />}
      {tab === 'assignment' && <AssignmentPage />}
      {tab === 'lists' && !usersQuery.isError && <ExportSection mentees={mentees} mentors={mentors} />}
      {tab === 'content' && <ContentManager users={users} tasks={tasksQuery.data ?? []} announcements={announcementsQuery.data ?? []} adminId={currentUser?.id ?? ''} onMessage={setMessage} onError={setError} />}
    </div>
  )
}

function StatisticCard({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${warning ? 'text-red-700' : 'text-gray-900'}`}>{value}</p>
    </div>
  )
}

function ExportSection({
  mentees,
  mentors,
}: {
  mentees: adminService.UserRow[]
  mentors: adminService.UserRow[]
}) {
  const [view, setView] = useState<'mentees' | 'mentors' | 'groups'>('mentees')

  const downloadRows = (rows: Record<string, unknown>[], filename: string, sheetName: string) => {
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    XLSX.writeFile(workbook, filename)
  }

  const menteeRows = mentees
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((mentee) => ({
      Name: mentee.name,
      'Matric Number': mentee.matric_number ?? '',
      Programme: mentee.programme ?? '',
      'Mentor ID': mentee.mentor_id ?? '',
      Email: mentee.email ?? '',
    }))

  const groupedRows = mentors
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((mentor) => {
      const mentorMentees = mentees
        .filter((mentee) => mentee.mentor_id === mentor.id)
        .sort((left, right) => left.name.localeCompare(right.name))

      return mentorMentees.length
        ? mentorMentees.map((mentee) => ({
            Mentor: mentor.name,
            'Mentor Email': mentor.email ?? '',
            Mentee: mentee.name,
            'Mentee Matric Number': mentee.matric_number ?? '',
            Programme: mentee.programme ?? '',
          }))
        : [{
            Mentor: mentor.name,
            'Mentor Email': mentor.email ?? '',
            Mentee: 'No mentees assigned',
            'Mentee Matric Number': '',
            Programme: '',
          }]
    })

  const viewConfig = {
    mentees: {
      label: 'Mentees',
      rows: menteeRows,
      filename: 'mentees.xlsx',
      sheetName: 'Mentees',
    },
    mentors: {
      label: 'Mentors',
      rows: mentors
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((mentor) => ({
          Name: mentor.name,
          Email: mentor.email ?? '',
          'Staff ID': mentor.matric_number ?? '',
          'Mentee Count': mentees.filter((mentee) => mentee.mentor_id === mentor.id).length,
        })),
      filename: 'mentors.xlsx',
      sheetName: 'Mentors',
    },
    groups: {
      label: 'Mentor & Mentee',
      rows: groupedRows,
      filename: 'mentors-and-mentees.xlsx',
      sheetName: 'Mentor Groups',
    },
  }[view]

  return (
    <section className="rounded-lg bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
        <h2 className="font-semibold text-gray-900">Download lists</h2>
        <p className="text-sm text-gray-500">Choose a list to view, then download the current list.</p>
        </div>
        <button
          type="button"
          onClick={() => downloadRows(viewConfig.rows, viewConfig.filename, viewConfig.sheetName)}
          className="rounded bg-ums-blue px-3 py-2 text-sm font-medium text-white hover:bg-ums-blue-light"
        >
          Download {viewConfig.label}
        </button>
      </div>
      <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-100 pb-3">
        {([
          ['mentees', `Mentees (${mentees.length})`],
          ['mentors', `Mentors (${mentors.length})`],
          ['groups', 'Mentor & Mentee'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={`rounded px-3 py-2 text-sm font-medium ${view === key ? 'bg-ums-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-xs text-gray-500">
              {Object.keys(viewConfig.rows[0] ?? {}).map((heading) => <th key={heading} className="p-2">{heading}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y">
            {viewConfig.rows.map((row, index) => (
              <tr key={`${view}-${index}`}>
                {Object.values(row).map((value, valueIndex) => <td key={valueIndex} className="p-2">{String(value)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {viewConfig.rows.length === 0 && <p className="py-4 text-sm text-gray-500">No records found.</p>}
      </div>
    </section>
  )
}

function SpreadsheetImport({ onComplete, onMessage, onError }: { onComplete: () => void; onMessage: (value: string) => void; onError: (value: string) => void }) {
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Partial<Record<ImportField, string>>>({})
  const [passwordMode, setPasswordMode] = useState<'manual' | 'column'>('manual')
  const [defaultPassword, setDefaultPassword] = useState('')
  const [passwordColumn, setPasswordColumn] = useState('')
  const [importRole, setImportRole] = useState<Role>('student')
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, imported: 0, failed: 0 })

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
      const nextHeaders = records.length ? Object.keys(records[0]) : []
      setHeaders(nextHeaders)
      setRows(records.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value)]))))
      const defaultMapping: Partial<Record<ImportField, string>> = {}
      const aliases: Partial<Record<ImportField, string[]>> = {
        matric_number: ['nomatrik', 'no matrik', 'matric number'],
        ic_number: ['kp', 'kad pengenalan', 'ic number'],
        name: ['nama', 'name'],
        email: ['email', 'e-mel', 'emel', 'staff email'],
        gender: ['jantina', 'gender'],
        religion: ['agamabm', 'agama', 'religion'],
        race: ['kaumbm', 'kaum', 'race'],
        phone: ['notelbimbit', 'no telefon', 'phone'],
        programme: ['nama program', 'program', 'programme'],
        channel: ['saluran', 'channel'],
        address: ['alamat', 'address'],
        postcode: ['poskod', 'postcode'],
        city: ['bandar', 'city'],
        state: ['negeri', 'state'],
        study_status: ['status pengajian', 'study status'],
        mentor: ['mentor'],
      }
      for (const field of importFields) {
        const accepted = aliases[field] ?? [field]
        const header = nextHeaders.find((value) => accepted.includes(value.trim().toLowerCase()))
        if (header) defaultMapping[field] = header
      }
      setMapping(defaultMapping)
      setPasswordColumn(nextHeaders.find((value) => value.trim().toLowerCase() === 'kp') ?? '')
      onMessage(`${records.length} rows loaded. Map the columns before importing.`)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to read spreadsheet.')
    }
  }

  async function importUsers() {
    const nameColumn = mapping.name
    const matricColumn = mapping.matric_number
    const emailColumn = mapping.email
    if (!nameColumn || (importRole === 'student' && !matricColumn) || (importRole !== 'student' && !emailColumn)) {
      onError(importRole === 'student'
        ? 'Map both Nomatrik and Nama before importing students.'
        : 'Map Nama and Email before importing mentors.')
      return
    }
    if (passwordMode === 'manual' && defaultPassword.trim().length < 8) {
      onError('Enter a manual password with at least 8 characters.')
      return
    }
    if (passwordMode === 'column' && !passwordColumn) {
      onError('Choose the spreadsheet column that contains each student password.')
      return
    }
    setImporting(true)
    setProgress({ current: 0, imported: 0, failed: 0 })
    try {
      let imported = 0
      const failures: string[] = []
      for (const [index, row] of rows.entries()) {
        const rowNumber = index + 2
        try {
          const name = row[nameColumn]?.trim()
          const matricNumber = matricColumn ? row[matricColumn]?.trim() : ''
          const email = importRole === 'student'
            ? studentAuthEmail(matricNumber)
            : row[emailColumn!]?.trim()
          const password = passwordMode === 'column'
            ? row[passwordColumn]?.trim() || defaultPassword.trim()
            : defaultPassword.trim()
          if (!name || (importRole === 'student' && !matricNumber) || !email || !password) {
            throw new Error(importRole === 'student'
              ? 'Nomatrik, Nama, and the selected password value are required.'
              : 'Nama, Email, and the selected password value are required.')
          }
          if (password.length < 8) {
            throw new Error('Password must contain at least 8 characters.')
          }
          const mentorValue = importRole === 'student' && mapping.mentor ? row[mapping.mentor]?.trim() : ''
          let mentorId: string | null = null
          if (mentorValue) {
            const mentor = await adminService.findUserByIdentifier(mentorValue)
            if (!mentor || mentor.role !== 'lecturer') {
              throw new Error(`Mentor "${mentorValue}" was not found as a lecturer.`)
            }
            mentorId = mentor.id
          }
          await adminService.createManagedUser({
            name,
            role: importRole,
            email,
            password,
            matric_number: matricNumber || undefined,
            mentor_id: importRole === 'student' ? mentorId : undefined,
            ic_number: mapping.ic_number ? row[mapping.ic_number] || undefined : undefined,
            gender: mapping.gender ? row[mapping.gender] || undefined : undefined,
            religion: mapping.religion ? row[mapping.religion] || undefined : undefined,
            race: mapping.race ? row[mapping.race] || undefined : undefined,
            phone: mapping.phone ? row[mapping.phone] || undefined : undefined,
            programme: mapping.programme ? row[mapping.programme] || undefined : undefined,
            address: mapping.address ? row[mapping.address] || undefined : undefined,
            postcode: mapping.postcode ? row[mapping.postcode] || undefined : undefined,
            city: mapping.city ? row[mapping.city] || undefined : undefined,
            state: mapping.state ? row[mapping.state] || undefined : undefined,
            study_status: mapping.study_status ? row[mapping.study_status] || undefined : undefined,
            channel: mapping.channel ? row[mapping.channel] || undefined : undefined,
          })
          imported += 1
        } catch (err) {
          failures.push(`Row ${rowNumber} (${row[nameColumn] || 'unnamed'}): ${err instanceof Error ? err.message : 'unknown error'}`)
        } finally {
          setProgress(() => ({
            current: index + 1,
            imported,
            failed: failures.length,
          }))
        }
      }
      onComplete()
      if (failures.length) {
        onError(`${imported} of ${rows.length} imported. Failed rows:\n${failures.slice(0, 10).join('\n')}${failures.length > 10 ? `\n…and ${failures.length - 10} more.` : ''}`)
      } else {
        onMessage(`${imported} users imported successfully.`)
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Import failed before rows could be processed.')
    } finally {
      setImporting(false)
    }
  }

  return <section className="max-w-3xl rounded-lg bg-white p-5 shadow-sm">
    <h2 className="font-semibold">Import students or mentors from Excel</h2>
    <p className="mb-4 text-sm text-gray-500">Upload a spreadsheet, choose the account type, confirm the detected columns, and edit any mapping that is incorrect. Student login emails are generated from Nomatrik; mentor imports require an email column for staff login.</p>
    <input type="file" accept=".xlsx,.xls,.csv" onChange={readFile} className="mb-4 block text-sm" />
    {headers.length > 0 && <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">Import account type
        <select className="mt-1 w-full rounded border px-3 py-2" value={importRole} onChange={(event) => setImportRole(event.target.value as Role)}>
          <option value="student">Students</option>
          <option value="lecturer">Mentors / lecturers</option>
        </select>
      </label>
      <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm">
        <p className="font-medium text-gray-700">Password for imported accounts</p>
        <div className="mt-2 flex flex-wrap gap-4">
          <label className="flex items-center gap-2"><input type="radio" checked={passwordMode === 'manual'} onChange={() => setPasswordMode('manual')} /> Use one manual password</label>
          <label className="flex items-center gap-2"><input type="radio" checked={passwordMode === 'column'} onChange={() => setPasswordMode('column')} /> Use a data column</label>
        </div>
        {passwordMode === 'manual' ? (
          <input type="password" minLength={8} className="mt-2 w-full rounded border px-3 py-2" placeholder="Minimum 8 characters" value={defaultPassword} onChange={(event) => setDefaultPassword(event.target.value)} />
        ) : (
          <div className="mt-2">
            <select className="w-full rounded border px-3 py-2" value={passwordColumn} onChange={(event) => setPasswordColumn(event.target.value)}>
              <option value="">Choose the password column</option>
              {headers.map((header) => <option key={header} value={header}>{header}</option>)}
            </select>
            <input type="password" minLength={8} className="mt-2 w-full rounded border px-3 py-2" placeholder="Optional fallback if a row is blank" value={defaultPassword} onChange={(event) => setDefaultPassword(event.target.value)} />
          </div>
        )}
      </div>
      <div className="rounded border border-gray-200 p-3">
        <p className="mb-2 text-sm font-medium text-gray-700">Column mapping</p>
        <p className="mb-3 text-xs text-gray-500">The suggested mapping is based on the headers in your file. Select a different header whenever a column name is wrong or ambiguous.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {importFields.map((field) => (
            <label key={field} className="text-sm">
              <span className="mb-1 block text-xs font-medium text-gray-600">{fieldLabel(field)}{((importRole === 'student' && field === 'matric_number') || (importRole === 'lecturer' && field === 'email') || field === 'name') && <span className="text-red-600"> *</span>}</span>
              <select className="w-full rounded border px-2 py-1.5" value={mapping[field] ?? ''} onChange={(event) => setMapping((previous) => ({ ...previous, [field]: event.target.value || undefined }))}>
                <option value="">Do not import</option>
                {headers.map((header) => <option key={header} value={header}>{header}</option>)}
              </select>
            </label>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="w-full min-w-[620px] text-left text-xs">
          <thead className="bg-gray-50 text-gray-500"><tr><th className="p-2">Row</th><th className="p-2">Nomatrik</th><th className="p-2">Nama</th><th className="p-2">Programme</th><th className="p-2">Password</th></tr></thead>
          <tbody className="divide-y">
            {rows.slice(0, 5).map((row, index) => <tr key={index}><td className="p-2">{index + 2}</td><td className="p-2">{mapping.matric_number ? row[mapping.matric_number] : '—'}</td><td className="p-2">{mapping.name ? row[mapping.name] : '—'}</td><td className="p-2">{mapping.programme ? row[mapping.programme] : '—'}</td><td className="p-2">{passwordMode === 'column' && passwordColumn ? (row[passwordColumn] ? 'Ready' : defaultPassword ? 'Fallback' : 'Missing') : defaultPassword ? 'Manual' : 'Missing'}</td></tr>)}
          </tbody>
        </table>
      </div>
      {importing && (
        <div className="rounded border border-blue-100 bg-blue-50 p-3" aria-live="polite">
          <div className="mb-2 flex items-center justify-between text-xs text-blue-800">
            <span>Importing row {progress.current} of {rows.length}</span>
            <span>{progress.imported} imported · {progress.failed} failed</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-blue-100">
            <div className="h-full rounded-full bg-ums-blue transition-all" style={{ width: `${rows.length ? (progress.current / rows.length) * 100 : 0}%` }} />
          </div>
        </div>
      )}
      <button disabled={importing || rows.length === 0} onClick={importUsers} className="rounded bg-ums-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{importing ? `Importing ${rows.length} accounts…` : `Import ${rows.length} ${importRole === 'student' ? 'students' : 'mentors'}`}</button>
    </div>}
  </section>
}

function fieldLabel(field: ImportField) {
  const labels: Record<ImportField, string> = {
    matric_number: 'Nomatrik',
    ic_number: 'KP',
    name: 'Nama',
    email: 'Email',
    gender: 'Jantina',
    religion: 'AgamaBM',
    race: 'KaumBM',
    phone: 'NoTelBimBit',
    programme: 'Nama program',
    channel: 'Saluran',
    address: 'Alamat',
    postcode: 'Poskod',
    city: 'Bandar',
    state: 'Negeri',
    study_status: 'Study status',
    mentor: 'Mentor',
  }
  return labels[field]
}

function ContentManager({ users, tasks, announcements, adminId, onMessage, onError }: { users: adminService.UserRow[]; tasks: Awaited<ReturnType<typeof adminService.listAllTasks>>; announcements: Awaited<ReturnType<typeof adminService.listAllAnnouncements>>; adminId: string; onMessage: (value: string) => void; onError: (value: string) => void }) {
  const queryClient = useQueryClient()
  const lecturers = users.filter((user) => user.role === 'lecturer')
  const [lecturerId, setLecturerId] = useState(lecturers[0]?.id ?? '')
  const selectedLecturerId = lecturerId || lecturers[0]?.id || ''
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)
  const [deletingAnnouncementId, setDeletingAnnouncementId] = useState<string | null>(null)

  async function createTask() {
    if (!selectedLecturerId || !taskTitle.trim()) return
    setBusy(true)
    try {
      await taskService.createTask({ lecturer_id: selectedLecturerId, title: taskTitle.trim(), description: null, due_date: dueDate ? new Date(dueDate).toISOString() : null, priority: 'medium' })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'tasks'] })
      setTaskTitle('')
      onMessage('Assignment created.')
    } catch (err) { onError(err instanceof Error ? err.message : 'Unable to create assignment.') } finally { setBusy(false) }
  }
  async function createAnnouncement() {
    if (!title.trim()) return
    setBusy(true)
    try {
      await adminService.createGlobalAnnouncement(adminId, title.trim(), content.trim())
      await queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] })
      setTitle('')
      setContent('')
      onMessage('Global announcement posted.')
    } catch (err) {
      onError(
        err instanceof Error
          ? `${err.message} Make sure migration 0012_admin_global_announcements.sql has been applied.`
          : 'Unable to post announcement. Apply migration 0012_admin_global_announcements.sql first.',
      )
    } finally { setBusy(false) }
  }
  async function removeTask(id: string) {
    setDeletingTaskId(id)
    try { await taskService.deleteTask(id); await queryClient.invalidateQueries({ queryKey: ['admin', 'tasks'] }); onMessage('Assignment deleted.') } catch (err) { onError(err instanceof Error ? err.message : 'Unable to delete assignment.') } finally { setDeletingTaskId(null) }
  }
  async function removeAnnouncement(id: string) {
    setDeletingAnnouncementId(id)
    try { await announcementService.deleteAnnouncement(id); await queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] }); onMessage('Announcement deleted.') } catch (err) { onError(err instanceof Error ? err.message : 'Unable to delete announcement.') } finally { setDeletingAnnouncementId(null) }
  }

  return <section className="grid gap-6 lg:grid-cols-2">
    <div className="rounded-lg bg-white p-4 shadow-sm"><h2 className="mb-3 font-semibold">Assignments</h2><select className="mb-2 w-full rounded border px-3 py-2 text-sm" value={selectedLecturerId} onChange={(event) => setLecturerId(event.target.value)}><option value="">Select lecturer</option>{lecturers.map((lecturer) => <option key={lecturer.id} value={lecturer.id}>{lecturer.name}</option>)}</select><input className="mb-2 w-full rounded border px-3 py-2 text-sm" placeholder="Assignment title" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} /><input type="date" className="mb-3 w-full rounded border px-3 py-2 text-sm" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /><LoadingButton loading={busy} loadingLabel="Adding assignment…" disabled={!selectedLecturerId} onClick={createTask} className="rounded bg-ums-blue px-3 py-2 text-sm text-white">Add assignment</LoadingButton><div className="mt-5 space-y-2">{tasks.map((task) => <div key={task.id} className="flex justify-between border-b pb-2 text-sm"><span>{task.title}</span><LoadingButton loading={deletingTaskId === task.id} loadingLabel="Deleting…" onClick={() => removeTask(task.id)} className="text-red-600">Delete</LoadingButton></div>)}</div></div>
    <div className="rounded-lg bg-white p-4 shadow-sm"><h2 className="mb-3 font-semibold">Global announcements</h2><input className="mb-2 w-full rounded border px-3 py-2 text-sm" placeholder="Announcement title" value={title} onChange={(event) => setTitle(event.target.value)} /><textarea className="mb-3 w-full rounded border px-3 py-2 text-sm" rows={4} placeholder="Announcement content" value={content} onChange={(event) => setContent(event.target.value)} /><LoadingButton loading={busy} loadingLabel="Posting announcement…" onClick={createAnnouncement} className="rounded bg-ums-blue px-3 py-2 text-sm text-white">Post announcement</LoadingButton><div className="mt-5 space-y-2">{announcements.map((announcement) => <div key={announcement.id} className="flex justify-between border-b pb-2 text-sm"><span>{announcement.title}{announcement.is_global ? ' (global)' : ''}</span><LoadingButton loading={deletingAnnouncementId === announcement.id} loadingLabel="Deleting…" onClick={() => removeAnnouncement(announcement.id)} className="text-red-600">Delete</LoadingButton></div>)}</div></div>
  </section>
}
