import { Fragment, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { useAuthStore } from '@/features/auth/authStore'
import * as adminService from '@/services/adminService'
import * as taskService from '@/services/taskService'
import * as announcementService from '@/services/announcementService'
import { queryKeys } from '@/lib/queryKeys'
import type { Database } from '@/types/database.types'
import { IMPORT_WORKER_COUNT, runWithConcurrency, validateImportRows, type ImportValidationRow } from './importUtils'
import AssignmentPage from './AssignmentPage'
import LoadingButton from '@/components/LoadingButton'
import * as mentorNotesService from '@/services/mentorNotesService'
import MeetingSummary from '@/features/meetings/MeetingSummary'
import MeetingPanel from '@/features/meetings/MeetingPanel'

type Role = Database['public']['Enums']['user_role']
type ImportField =
  | 'matric_number' | 'ic_number' | 'name' | 'email' | 'gender' | 'religion' | 'race'
  | 'phone' | 'programme' | 'channel' | 'address' | 'postcode' | 'city' | 'state'
  | 'study_status' | 'mentor' | 'job_title' | 'grade' | 'ums_per'
  | 'study_status_smp' | 'lecture_group' | 'residence_college' | 'room_number' | 'bka_status'
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
  job_title: string
  grade: string
  ums_per: string
}
const PROGRAMME_OPTIONS = [
  { code: 'UH0010001', name: 'Asasi Sains', english: 'Foundation in Science' },
  { code: 'UH0010002', name: 'Asasi Teknologi Maklumat', english: 'Foundation in Information Technology' },
  { code: 'UH0010003', name: 'Asasi Agrisains', english: 'Foundation in Agricultural Science' },
  { code: 'UH0010004', name: 'Asasi Sains Sosial', english: 'Foundation in Social Science' },
] as const

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
  job_title: '',
  grade: '',
  ums_per: '',
}
const importFields: ImportField[] = [
  'matric_number', 'ic_number', 'name', 'email', 'gender', 'religion', 'race', 'phone',
  'programme', 'channel', 'address', 'postcode', 'city', 'state', 'study_status', 'mentor',
  'study_status_smp', 'lecture_group', 'residence_college', 'room_number', 'bka_status',
]
const mentorImportFields: ImportField[] = ['name', 'job_title', 'grade', 'ums_per', 'email']
const DELETE_STUDENTS_PHRASE = 'I-hereby-ending-this-session'
const DELETE_MENTORS_PHRASE = 'I-hereby-ending-all-mentor-accounts'

export default function AdminControlPage() {
  const currentUser = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab')
  const [tab, setTab] = useState<'users' | 'assignment' | 'import' | 'content' | 'meetings' | 'lists'>(
    initialTab === 'assignment' || initialTab === 'import' || initialTab === 'content' || initialTab === 'meetings' || initialTab === 'lists' ? initialTab : 'users',
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
  const students = users.filter((user) => user.role === 'student')
  const mentors = users.filter((user) => user.role === 'lecturer')
  const staff = users.filter((user) => user.role !== 'student')
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
        job_title: form.job_title.trim() || undefined,
        grade: form.grade.trim() || undefined,
        ums_per: form.ums_per.trim() || undefined,
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
    if (editingId === user.id) {
      setEditingId(null)
      setForm(emptyForm)
      return
    }
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
      job_title: user.job_title ?? '',
      grade: user.grade ?? '',
      ums_per: user.ums_per ?? '',
    })
    setTab('users')
  }

  function submitUser(event: FormEvent) {
    event.preventDefault()
    if (editingId && !window.confirm(`Are you sure you want to save these changes to ${form.name}?`)) {
      return
    }
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
          ['meetings', 'Summary meeting'],
          ['lists', 'Mentor & Mentee List'],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-3 py-2 text-sm font-medium ${tab === key ? 'border-b-2 border-ums-blue text-ums-blue' : 'text-gray-600'}`}>
            {label}
          </button>
        ))}
      </nav>
      {message && <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>}
      {error && <p className="whitespace-pre-line rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {usersQuery.isError && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          Could not load users: {usersQuery.error instanceof Error ? usersQuery.error.message : 'Supabase returned an unknown error.'}
          Check that the logged-in profile exists in public.users and has role admin.
        </p>
      )}
      {tab === 'users' && (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="mb-4 flex gap-2">
              <input className="w-full rounded border border-gray-300 px-3 py-2 text-sm" placeholder="Search name, email, matric or staff ID" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <p className="mb-4 rounded bg-blue-50 px-3 py-2 text-xs text-blue-800">
              New student and mentor accounts must be added through the Excel import tab. Existing accounts can be edited below.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b text-xs text-gray-500"><th className="p-2">Name</th><th className="p-2">Role</th><th className="p-2">Login</th><th className="p-2">Actions</th></tr></thead>
                <tbody className="divide-y">
                  {filteredUsers.map((user) => (
                    <Fragment key={user.id}>
                      <tr>
                        <td className="p-2"><Link to={user.role === 'student' ? `/admin/student/${user.id}` : `/admin/lecturer/${user.id}`} className="font-medium text-ums-blue hover:underline">{user.name}</Link><p className="text-xs text-gray-500">{user.matric_number ?? '—'}</p></td>
                        <td className="p-2 capitalize">{user.role}</td>
                        <td className="p-2 text-xs">{user.role === 'student' ? (user.matric_number ?? '—') : (user.email ?? '—')}</td>
                        <td className="p-2"><div className="flex gap-2"><button className="text-ums-blue hover:underline" onClick={() => editUser(user)}>Edit</button><LoadingButton className="text-red-600 hover:underline" loading={deletingUserId === user.id} loadingLabel="Deleting…" disabled={user.id === currentUser?.id} onClick={() => { if (window.confirm(`Delete ${user.name}?`)) { setDeletingUserId(user.id); deleteUser.mutate(user.id, { onSettled: () => setDeletingUserId(null) }) } }}>Delete</LoadingButton></div></td>
                      </tr>
                      {editingId === user.id && (
                        <tr key={`${user.id}-editor`}>
                          <td colSpan={4} className="bg-slate-50 p-3">
                            <InlineUserEditor
                              form={form}
                              updateForm={updateForm}
                              onSubmit={submitUser}
                              onCancel={() => { setEditingId(null); setForm(emptyForm) }}
                              isSaving={saveUser.isPending}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
          <form onSubmit={submitUser} className="hidden">
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
      {tab === 'lists' && !usersQuery.isError && <ExportSection students={students} mentees={mentees} mentors={mentors} staff={staff} />}
      {tab === 'content' && <ContentManager users={users} tasks={tasksQuery.data ?? []} announcements={announcementsQuery.data ?? []} adminId={currentUser?.id ?? ''} onMessage={setMessage} onError={setError} />}
      {tab === 'meetings' && (
        <div className="space-y-6">
          <MeetingPanel />
          <MeetingSummary />
        </div>
      )}
    </div>
  )
}

function ExportSection({
  students,
  mentees,
  mentors,
  staff,
}: {
  students: adminService.UserRow[]
  mentees: adminService.UserRow[]
  mentors: adminService.UserRow[]
  staff: adminService.UserRow[]
}) {
  const [view, setView] = useState<'students' | 'staff' | 'mentees' | 'mentors' | 'groups'>('students')
  const notesQuery = useQuery({
    queryKey: ['admin', 'mentor-notes', 'all'],
    queryFn: () => mentorNotesService.listMentorNotes(),
  })
  const flagsQuery = useQuery({
    queryKey: ['admin', 'attention-flags', 'all'],
    queryFn: () => mentorNotesService.listAttentionFlags(),
  })

  const downloadRows = (rows: Record<string, unknown>[], filename: string, sheetName: string) => {
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(rows)
    if (sheetName === 'Mentees') {
      const headings = Object.keys(rows[0] ?? {})
      rows.forEach((row, rowIndex) => {
        if (!row['Attention Severity']) return
        for (let columnIndex = 0; columnIndex < headings.length; columnIndex += 1) {
          const cellAddress = XLSX.utils.encode_cell({ r: rowIndex + 1, c: columnIndex })
          const cell = worksheet[cellAddress] as (XLSX.CellObject & { s?: Record<string, unknown> }) | undefined
          if (cell) {
            cell.s = {
              fill: { patternType: 'solid', fgColor: { rgb: row['Attention Severity'] === 'urgent' ? 'FECACA' : 'FEE2E2' } },
            }
          }
        }
      })
    }
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    XLSX.writeFile(workbook, filename, { cellStyles: true })
  }

  const noteByStudent = new Map((notesQuery.data ?? []).map((note) => [note.student_id, note]))
  const flagByStudent = new Map(
    (flagsQuery.data ?? [])
      .filter((flag) => ['open', 'acknowledged', 'in_progress'].includes(flag.status))
      .map((flag) => [flag.student_id, flag]),
  )
  const menteeRows = mentees
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((mentee) => ({
      Name: mentee.name,
      'Matric Number': mentee.matric_number ?? '',
      Programme: mentee.programme ?? '',
      'Mentor ID': mentee.mentor_id ?? '',
      Email: mentee.email ?? '',
      'Has Mentor Note': noteByStudent.has(mentee.id) ? 'Yes' : 'No',
      'Latest Mentor Note': noteByStudent.get(mentee.id)?.note ?? '',
      'Attention Remark': flagByStudent.get(mentee.id)?.reason ?? '',
      'Attention Severity': flagByStudent.get(mentee.id)?.severity ?? '',
      'Attention Status': flagByStudent.get(mentee.id)?.status ?? '',
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

  const studentRows = students
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((student) => ({
      'NO. MATRIK': student.matric_number ?? '',
      'NO. KAD PENGENALAN': student.ic_number ?? '',
      'NAMA PELAJAR': student.name,
      JANTINA: student.gender ?? '',
      AGAMA: student.religion ?? '',
      KAUM: student.race ?? '',
      'NO. TELEFON (WHATSAPP)': student.phone ?? '',
      'PROGRAM ASASI': student.programme ?? '',
      'STATUS PENGAJIAN': student.study_status ?? '',
      'STATUS SMP': student.study_status_smp ?? '',
      'KUMPULAN KULIAH': student.lecture_group ?? '',
      'KOLEJ KEDIAMAN': student.residence_college ?? '',
      'NO. BILIK': student.room_number ?? '',
      'NAMA MENTOR': mentors.find((mentor) => mentor.id === student.mentor_id)?.name ?? '',
      'STATUS BKA': student.bka_status ?? '',
      'ALAMAT RUMAH': student.address ?? '',
      POSKOD: student.postcode ?? '',
      BANDAR: student.city ?? '',
      NEGERI: student.state ?? '',
    }))

  const staffRows = staff
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((staff) => ({
      Name: staff.name,
      Role: staff.role === 'lecturer' ? 'Mentor' : 'Administrator',
      Email: staff.email ?? '',
      'Staff ID': staff.matric_number ?? '',
      Phone: staff.phone ?? '',
      Gender: staff.gender ?? '',
      Address: staff.address ?? '',
      Postcode: staff.postcode ?? '',
      City: staff.city ?? '',
      State: staff.state ?? '',
      'Job title': staff.job_title ?? '',
      Grade: staff.grade ?? '',
      'UMS Per': staff.ums_per ?? '',
    }))

  const viewConfig = {
    students: {
      label: 'All students',
      rows: studentRows,
      filename: 'students-full-data.xlsx',
      sheetName: 'Students',
    },
    staff: {
      label: 'Mentors & administrators',
      rows: staffRows,
      filename: 'mentors-and-administrators.xlsx',
      sheetName: 'Staff',
    },
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
        <p className="text-xs text-gray-400">All students exports the same column names as your source spreadsheet, ready to edit and re-import.</p>
        <p className="text-xs text-gray-400">The mentee export includes the latest private note and active attention remark.</p>
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
          ['students', `All students (${students.length})`],
          ['staff', `Mentors & administrators (${staffRows.length})`],
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
  type ImportFailure = { rowNumber: number; name: string; identifier: string; reason: string }
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Partial<Record<ImportField, string>>>({})
  const [passwordMode, setPasswordMode] = useState<'manual' | 'column'>('manual')
  const [defaultPassword, setDefaultPassword] = useState('')
  const [passwordColumn, setPasswordColumn] = useState('')
  const [importRole, setImportRole] = useState<'student' | 'lecturer'>('student')
  const [importing, setImporting] = useState(false)
  const cancelImportRequested = useRef(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, created: 0, updated: 0, failed: 0, etaSeconds: 0 })
  const [validationSummary, setValidationSummary] = useState<{ valid: number; willCreate: number; willUpdate: number; invalid: number } | null>(null)
  const [failedRows, setFailedRows] = useState<ImportFailure[]>([])
  const [showFailureDetails, setShowFailureDetails] = useState(false)
  const [individualRole, setIndividualRole] = useState<Role>('lecturer')
  const [individualForm, setIndividualForm] = useState({
    name: '',
    matric_number: '',
    email: '',
    password: '',
    job_title: '',
    grade: '',
    ums_per: '',
    programme: '',
  })
  const [savingIndividual, setSavingIndividual] = useState(false)
  const [importMode, setImportMode] = useState<'excel' | 'individual'>('excel')

  useEffect(() => {
    if (!importing) return
    const previousOverflow = document.body.style.overflow
    const previousTouchAction = document.body.style.touchAction
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = 'An import is still running. Confirm to leave and cancel it.'
    }
    window.addEventListener('beforeunload', warnBeforeLeave)
    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.touchAction = previousTouchAction
      window.removeEventListener('beforeunload', warnBeforeLeave)
    }
  }, [importing])

  function requestImportCancel() {
    if (!importing) return
    if (window.confirm('Confirm to cancel the import? Completed rows will remain imported, but remaining rows will not be processed.')) {
      cancelImportRequested.current = true
    }
  }

  function updateIndividual(field: keyof typeof individualForm, value: string) {
    setIndividualForm((previous) => ({ ...previous, [field]: value }))
  }

  async function addIndividualUser(event: FormEvent) {
    event.preventDefault()
    const name = individualForm.name.trim()
    const password = individualForm.password.trim()
    const matricNumber = individualForm.matric_number.trim()
    const email = individualForm.email.trim()
    const requiredMentorFields = [individualForm.job_title, individualForm.grade, individualForm.ums_per]
    if (!name || password.length < 8) {
      onError('Name and a password with at least 8 characters are required.')
      return
    }
    if (individualRole === 'student' && !matricNumber) {
      onError('NoMatrik is required for an individual student.')
      return
    }
    if (individualRole === 'lecturer' && (!email || requiredMentorFields.some((value) => !value.trim()))) {
      onError('Mentor accounts require Nama, Jawatan, Gred, UMS PER, and Email.')
      return
    }
    setSavingIndividual(true)
    try {
      await adminService.createManagedUser({
        name,
        role: individualRole,
        email: individualRole === 'lecturer' ? email : undefined,
        password,
        matric_number: individualRole === 'student' ? matricNumber : undefined,
        programme: individualForm.programme.trim() || undefined,
        job_title: individualRole === 'lecturer' ? individualForm.job_title.trim() : undefined,
        grade: individualRole === 'lecturer' ? individualForm.grade.trim() : undefined,
        ums_per: individualRole === 'lecturer' ? individualForm.ums_per.trim() : undefined,
      })
      setIndividualForm({
        name: '',
        matric_number: '',
        email: '',
        password: '',
        job_title: '',
        grade: '',
        ums_per: '',
        programme: '',
      })
      onComplete()
      onMessage(`${individualRole === 'lecturer' ? 'Mentor' : 'Student'} account created successfully.`)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to create the account.')
    } finally {
      setSavingIndividual(false)
    }
  }

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      if (!sheet) throw new Error('The workbook does not contain a readable worksheet.')
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: '',
        raw: true,
        blankrows: false,
      })
      const normalizeHeader = (value: string) => value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
      const knownHeaders = [
        'no matrik', 'nomatrik', 'matric number', 'no kad pengenalan', 'nama pelajar',
        'kp', 'ic number', 'nama', 'name', 'jantina', 'gender', 'agama', 'agama bm',
        'religion', 'kaum', 'kaum bm', 'race', 'no telefon whatsapp', 'no telefon',
        'notelbimbit', 'phone', 'program asasi', 'nama program', 'program', 'programme',
        'saluran', 'channel', 'alamat rumah', 'alamat', 'address', 'poskod', 'postcode',
        'bandar', 'city', 'negeri', 'state', 'status pengajian', 'study status',
        'status smp', 'kumpulan kuliah', 'kolej kediaman', 'no bilik', 'nama mentor',
        'mentor', 'status bka', 'email', 'jawatan', 'job title', 'position', 'gred',
        'grade', 'ums per', 'ums_per', 'ums perkhidmatan', 'per',
      ].map(normalizeHeader)
      const headerRowIndex = matrix.findIndex((row) => {
        const matches = row
          .map((value) => normalizeHeader(String(value ?? '').trim()))
          .filter((value) => value && knownHeaders.includes(value))
        return matches.length >= 2
      })
      if (headerRowIndex < 0) {
        const candidateRows = matrix.slice(0, 20).map((row, index) => {
          const recognized = row
            .map((value) => normalizeHeader(String(value ?? '').trim()))
            .filter((value) => value && knownHeaders.includes(value))
          return recognized.length ? `row ${index + 1}: ${recognized.length} recognized column${recognized.length === 1 ? '' : 's'} (${recognized.join(', ')})` : ''
        }).filter(Boolean)
        const detail = candidateRows.length
          ? ` ${candidateRows.join('; ')}.`
          : ' No supported headers were detected in the first 20 rows.'
        throw new Error(`Could not find the spreadsheet header row: at least 2 supported columns are required (for example Nama and Nomatrik).${detail}`)
      }
      const rawHeaders = matrix[headerRowIndex].map((value) => String(value ?? '').trim())
      const usedHeaders = new Map<string, number>()
      const nextHeaders = rawHeaders.map((header, index) => {
        const baseHeader = header || `Unnamed column ${index + 1}`
        const occurrence = (usedHeaders.get(baseHeader) ?? 0) + 1
        usedHeaders.set(baseHeader, occurrence)
        return occurrence === 1 ? baseHeader : `${baseHeader} (${occurrence})`
      })
      if (!nextHeaders.length) throw new Error('The selected worksheet is empty or has no header row.')
      const records = matrix.slice(headerRowIndex + 1).map((row) => Object.fromEntries(
        nextHeaders.map((header, index) => {
          const value = row[index]
          if (value instanceof Date) return [header, value.toISOString()]
          return [header, String(value ?? '').trim()]
        }),
      ))
      setHeaders(nextHeaders)
      setRows(records)
      setFailedRows([])
      setShowFailureDetails(false)
      const defaultMapping: Partial<Record<ImportField, string>> = {}
      const aliases: Partial<Record<ImportField, string[]>> = {
        matric_number: ['no matrik', 'nomatrik', 'matric number'],
        ic_number: ['no kad pengenalan', 'kad pengenalan', 'kp', 'ic number'],
        name: ['nama pelajar', 'nama', 'name'],
        email: ['email', 'e-mel', 'emel', 'staff email'],
        gender: ['jantina', 'gender'],
        religion: ['agama', 'agama bm', 'religion'],
        race: ['kaum', 'kaum bm', 'race'],
        phone: ['no telefon whatsapp', 'no telefon', 'notelbimbit', 'phone'],
        programme: ['program asasi', 'nama program', 'program', 'programme'],
        channel: ['saluran', 'channel'],
        address: ['alamat rumah', 'alamat', 'address'],
        postcode: ['poskod', 'postcode'],
        city: ['bandar', 'city'],
        state: ['negeri', 'state'],
        study_status: ['status pengajian', 'study status'],
        study_status_smp: ['status smp'],
        lecture_group: ['kumpulan kuliah'],
        residence_college: ['kolej kediaman'],
        room_number: ['no bilik'],
        mentor: ['nama mentor', 'mentor'],
        bka_status: ['status bka'],
        job_title: ['jawatan', 'job title', 'position'],
        grade: ['gred', 'grade'],
        ums_per: ['ums per', 'ums_per', 'ums perkhidmatan', 'per'],
      }
      for (const field of [...importFields, ...mentorImportFields]) {
        const accepted = aliases[field] ?? [field]
        const normalizedAccepted = accepted.map(normalizeHeader)
        const header = nextHeaders.find((value) => normalizedAccepted.includes(normalizeHeader(value)))
        if (header) defaultMapping[field] = header
      }
      setMapping(defaultMapping)
      setPasswordColumn(nextHeaders.find((value) => value.trim().toLowerCase() === 'kp') ?? '')
      onMessage(`${records.length} rows loaded from worksheet "${sheetName}" (header row ${headerRowIndex + 1}). Map the columns before importing.`)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to read spreadsheet.')
    }
  }

  async function importUsers() {
    const nameColumn = mapping.name
    const emailColumn = mapping.email
    const missingMappedColumns = Object.entries(mapping)
      .filter(([, column]) => column && !headers.includes(column))
      .map(([field, column]) => `${field} → ${column}`)
    if (missingMappedColumns.length) {
      onError(`The selected spreadsheet no longer contains mapped column(s): ${missingMappedColumns.join(', ')}. Reload the file and map those fields again.`)
      return
    }
    if (!nameColumn || (importRole !== 'student' && !emailColumn)) {
      onError(importRole === 'student'
        ? 'Map Nama and NoMatrik before importing students.'
        : 'Map Nama and Email before importing mentors.')
      return
    }
    if (importRole === 'lecturer' && ['name', 'job_title', 'grade', 'ums_per', 'email'].some((field) => !mapping[field as ImportField])) {
      onError('Map all required mentor columns: Nama, Jawatan, Gred, UMS Per, and Email. Programme is optional.')
      return
    }
    if (passwordMode === 'manual' && defaultPassword.trim().length < 8) {
      onError('Enter a manual password with at least 8 characters.')
      return
    }
    if (passwordMode === 'column' && !passwordColumn) {
      onError('Choose the spreadsheet column that contains each account password.')
      return
    }
    setImporting(true)
    cancelImportRequested.current = false
    setProgress({ current: 0, total: rows.length, created: 0, updated: 0, failed: 0, etaSeconds: 0 })
    setFailedRows([])
    setShowFailureDetails(false)
    try {
      const [allUsers, allMentors] = await Promise.all([adminService.listAllUsers(), adminService.getAvailableMentors()])
      const validation = validateImportRows(rows, importRole, mapping, defaultPassword, passwordMode, passwordColumn, allUsers, allMentors)
      setValidationSummary(validation.summary)
      const invalidFailures: ImportFailure[] = validation.rows
        .filter((row) => row.errors.length)
        .map((row) => ({ rowNumber: row.rowNumber, name: row.name || 'unnamed', identifier: row.identifier, reason: row.errors.join(' ') }))
      const validRows = validation.rows.filter((row) => row.errors.length === 0)
      if (!window.confirm(`Dry run: ${validation.summary.valid} valid, ${validation.summary.willCreate} will create, ${validation.summary.willUpdate} will update, ${validation.summary.invalid} invalid. Continue?`)) {
        setFailedRows(invalidFailures)
        return
      }
      const failures: ImportFailure[] = [...invalidFailures]
      let created = 0
      let updated = 0
      const startedAt = Date.now()
      const mentorRows = importRole === 'lecturer' ? validRows : []
      const studentRows = importRole === 'student' ? validRows : []
      const orderedRows = [...mentorRows, ...studentRows]
      const processRow = async (prepared: ImportValidationRow) => {
        const row = rows[prepared.sourceIndex]
        try {
          const userInput = {
            name: prepared.name,
            role: importRole,
            email: importRole === 'student' ? undefined : prepared.email,
            password: prepared.password,
            matric_number: prepared.matricNumber || undefined,
            mentor_id: importRole === 'student' ? prepared.mentorId : undefined,
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
            study_status_smp: mapping.study_status_smp ? row[mapping.study_status_smp] || undefined : undefined,
            lecture_group: mapping.lecture_group ? row[mapping.lecture_group] || undefined : undefined,
            residence_college: mapping.residence_college ? row[mapping.residence_college] || undefined : undefined,
            room_number: mapping.room_number ? row[mapping.room_number] || undefined : undefined,
            bka_status: mapping.bka_status ? row[mapping.bka_status] || undefined : undefined,
            channel: mapping.channel ? row[mapping.channel] || undefined : undefined,
            job_title: mapping.job_title ? row[mapping.job_title] || undefined : undefined,
            grade: mapping.grade ? row[mapping.grade] || undefined : undefined,
            ums_per: mapping.ums_per ? row[mapping.ums_per] || undefined : undefined,
          } satisfies adminService.UserInput
          const findExisting = () => adminService.findUserByIdentifier(prepared.identifier)
          if (prepared.existingUser) {
            await adminService.updateManagedUserWithRetry(prepared.existingUser.id, userInput, findExisting)
          } else {
            await adminService.createManagedUserWithRetry(userInput, findExisting)
          }
          if (prepared.existingUser) updated += 1
          else created += 1
        } catch (err) {
          failures.push({ rowNumber: prepared.rowNumber, name: prepared.name || 'unnamed', identifier: prepared.identifier, reason: err instanceof Error ? err.message : 'unknown error' })
        } finally {
          const current = created + updated + failures.length
          const elapsed = Math.max(1, Date.now() - startedAt)
          const rate = Math.max(0.001, (current - invalidFailures.length) / elapsed)
          setProgress({ current: Math.min(rows.length, current), total: rows.length, created, updated, failed: failures.length, etaSeconds: Math.ceil(Math.max(0, orderedRows.length - (current - invalidFailures.length)) / (rate * 1000)) })
          setFailedRows([...failures])
        }
      }
      await runWithConcurrency(orderedRows, IMPORT_WORKER_COUNT, processRow, () => cancelImportRequested.current)
      const wasCancelled = cancelImportRequested.current
      onComplete()
      if (wasCancelled) {
        onError(`${created + updated} of ${rows.length} rows imported before the import was cancelled.`)
        return
      }
      if (failures.length) {
        onError(`${created + updated} of ${rows.length} imported. ${failures.length} row${failures.length === 1 ? '' : 's'} failed. Download the failed rows and re-import them after correction.`)
      } else {
        onMessage(`${created} created and ${updated} updated successfully.`)
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Import failed before rows could be processed.')
    } finally {
      setImporting(false)
    }
  }

  const missingStudentFields = (row: Record<string, string>): ImportField[] => importRole === 'student'
    ? (['ic_number', 'phone'] as ImportField[]).filter((field) => !mapping[field] || !row[mapping[field]!]?.trim())
    : []

  return <section className="max-w-4xl rounded-lg bg-white p-5 shadow-sm">
    <h2 className="font-semibold">Import students or mentors from Excel</h2>
    <p className="mb-4 text-sm text-gray-500">Upload a spreadsheet, choose the account type, confirm the detected columns, and edit any mapping that is incorrect. Student Nomatrik and mentor Email are required for safe re-imports. KP and phone are optional. Mentor imports use Nama, Jawatan, Gred, UMS PER, and Email.</p>
    <div className="mb-4 flex gap-2 border-b border-gray-200 pb-3">
      <button type="button" onClick={() => setImportMode('excel')} className={`rounded px-3 py-2 text-sm font-medium ${importMode === 'excel' ? 'bg-ums-blue text-white' : 'bg-gray-100 text-gray-700'}`}>
        Import Excel
      </button>
      <button type="button" onClick={() => setImportMode('individual')} className={`rounded px-3 py-2 text-sm font-medium ${importMode === 'individual' ? 'bg-ums-blue text-white' : 'bg-gray-100 text-gray-700'}`}>
        Add one account
      </button>
    </div>
    {importMode === 'individual' && <form onSubmit={addIndividualUser} className="mb-5 rounded border border-blue-100 bg-blue-50 p-4">
      <h3 className="font-semibold text-blue-900">Add one account</h3>
      <p className="mb-3 text-xs text-blue-800">This form works without uploading an Excel file. Use Excel import below for multiple accounts.</p>
      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-gray-700">Account type
          <select className="mt-1 w-full rounded border px-3 py-2 text-sm" value={individualRole} onChange={(event) => setIndividualRole(event.target.value as Role)}>
            <option value="lecturer">Mentor / lecturer</option>
            <option value="student">Student</option>
          </select>
        </label>
        <label className="text-xs font-medium text-gray-700">Nama *
          <input required className="mt-1 w-full rounded border px-3 py-2 text-sm" value={individualForm.name} onChange={(event) => updateIndividual('name', event.target.value)} />
        </label>
        {individualRole === 'lecturer' ? (
          <>
            <label className="text-xs font-medium text-gray-700">Jawatan *
              <input required className="mt-1 w-full rounded border px-3 py-2 text-sm" value={individualForm.job_title} onChange={(event) => updateIndividual('job_title', event.target.value)} />
            </label>
            <label className="text-xs font-medium text-gray-700">Gred *
              <input required className="mt-1 w-full rounded border px-3 py-2 text-sm" value={individualForm.grade} onChange={(event) => updateIndividual('grade', event.target.value)} />
            </label>
            <label className="text-xs font-medium text-gray-700">UMS PER *
              <input required className="mt-1 w-full rounded border px-3 py-2 text-sm" value={individualForm.ums_per} onChange={(event) => updateIndividual('ums_per', event.target.value)} />
            </label>
            <label className="text-xs font-medium text-gray-700">Email *
              <input required type="email" className="mt-1 w-full rounded border px-3 py-2 text-sm" value={individualForm.email} onChange={(event) => updateIndividual('email', event.target.value)} />
            </label>
          </>
        ) : (
          <>
            <label className="text-xs font-medium text-gray-700">NoMatrik *
              <input required className="mt-1 w-full rounded border px-3 py-2 text-sm" value={individualForm.matric_number} onChange={(event) => updateIndividual('matric_number', event.target.value)} />
            </label>
            <label className="text-xs font-medium text-gray-700">Programme
              <select className="mt-1 w-full rounded border px-3 py-2 text-sm" value={individualForm.programme} onChange={(event) => updateIndividual('programme', event.target.value)}>
                <option value="">Select programme</option>
                {PROGRAMME_OPTIONS.map((programme) => (
                  <option key={programme.code} value={programme.code}>{programme.code} · {programme.name} · {programme.english}</option>
                ))}
              </select>
            </label>
          </>
        )}
        <label className="text-xs font-medium text-gray-700">Password *
          <input required minLength={8} type="password" className="mt-1 w-full rounded border px-3 py-2 text-sm" value={individualForm.password} onChange={(event) => updateIndividual('password', event.target.value)} placeholder="Minimum 8 characters" />
        </label>
      </div>
      <button type="submit" disabled={savingIndividual} className="rounded bg-ums-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {savingIndividual ? 'Creating account…' : 'Add account'}
      </button>
    </form>}
    {importMode === 'excel' && <input type="file" accept=".xlsx,.xls,.csv" onChange={readFile} className="mb-4 block text-sm" />}
    {importMode === 'excel' && headers.length > 0 && <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">Import account type
        <select className="mt-1 w-full rounded border px-3 py-2" value={importRole} onChange={(event) => setImportRole(event.target.value as 'student' | 'lecturer')}>
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
          {(importRole === 'lecturer' ? mentorImportFields : importFields).map((field) => (
            <label key={field} className="text-sm">
              <span className="mb-1 block text-xs font-medium text-gray-600">{fieldLabel(field)}{((importRole === 'lecturer' && ['name', 'job_title', 'grade', 'ums_per', 'email'].includes(field)) || field === 'name') && <span className="text-red-600"> *</span>}</span>
              <select className="w-full rounded border px-2 py-1.5" value={mapping[field] ?? ''} onChange={(event) => setMapping((previous) => ({ ...previous, [field]: event.target.value || undefined }))}>
                <option value="">Do not import</option>
                {headers.map((header) => <option key={header} value={header}>{header}</option>)}
              </select>
            </label>
          ))}
        </div>
      </div>
      <div className="max-h-96 overflow-auto rounded border border-gray-200">
        <table className="w-full min-w-[620px] text-left text-xs">
          <thead className="sticky top-0 bg-gray-50 text-gray-500"><tr><th className="p-2">Row</th><th className="p-2">{importRole === 'lecturer' ? 'UMS PER' : 'NoMatrik'}</th><th className="p-2">Nama</th><th className="p-2">{importRole === 'lecturer' ? 'Jawatan' : 'Programme'}</th><th className="p-2">Password</th><th className="p-2">Student warnings</th></tr></thead>
          <tbody className="divide-y">
            {rows.map((row, index) => <tr key={index}><td className="p-2">{index + 2}</td><td className="p-2">{importRole === 'lecturer' ? (mapping.ums_per ? row[mapping.ums_per] : '—') : (mapping.matric_number ? row[mapping.matric_number] : '—')}</td><td className="p-2">{mapping.name ? row[mapping.name] : '—'}</td><td className="p-2">{importRole === 'lecturer' ? (mapping.job_title ? row[mapping.job_title] : '—') : (mapping.programme ? row[mapping.programme] : '—')}</td><td className="p-2">{passwordMode === 'column' && passwordColumn ? (row[passwordColumn] ? 'Ready' : defaultPassword ? 'Fallback' : 'Missing') : defaultPassword ? 'Manual' : 'Missing'}</td><td className="p-2 text-xs">{missingStudentFields(row).length ? <span className="font-medium text-amber-700">Missing: {missingStudentFields(row).map(fieldLabel).join(', ')}</span> : <span className="text-green-700">Complete</span>}</td></tr>)}
          </tbody>
        </table>
      </div>
      {validationSummary && (
        <div className="rounded border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
          Dry-run summary: <strong>{validationSummary.valid} valid</strong> · {validationSummary.willCreate} will create · {validationSummary.willUpdate} will update · {validationSummary.invalid} invalid (skipped).
        </div>
      )}
      {importing && (
        <div className="rounded border border-blue-100 bg-blue-50 p-3" aria-live="polite">
          <div className="mb-2 flex items-center justify-between text-xs text-blue-800">
            <span>Processed {progress.current} of {progress.total}{progress.etaSeconds > 0 ? ` · about ${progress.etaSeconds}s remaining` : ''}</span>
            <span className="flex items-center gap-2">
              <span>{progress.created} created · {progress.updated} updated · {progress.failed} failed</span>
              {progress.failed > 0 && (
                <button type="button" onClick={() => setShowFailureDetails((visible) => !visible)} className="font-medium text-red-700 underline">
                  {showFailureDetails ? 'Hide details' : 'View details'}
                </button>
              )}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-blue-100">
            <div className="h-full rounded-full bg-ums-blue transition-all" style={{ width: `${rows.length ? (progress.current / rows.length) * 100 : 0}%` }} />
          </div>
          <button type="button" onClick={requestImportCancel} className="mt-3 rounded border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">
            Force cancel import
          </button>
          {showFailureDetails && failedRows.length > 0 && <ImportFailureDetails failures={failedRows} />}
        </div>
      )}
      {!importing && failedRows.length > 0 && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <div className="flex items-center justify-between gap-3">
            <span>{failedRows.length} import row{failedRows.length === 1 ? '' : 's'} failed.</span>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowFailureDetails((visible) => !visible)} className="font-medium text-red-700 underline">
                {showFailureDetails ? 'Hide details' : 'View details'}
              </button>
              <button type="button" onClick={() => downloadImportFailures(failedRows)} className="font-medium text-red-700 underline">
                Download CSV
              </button>
            </div>
          </div>
          {showFailureDetails && <ImportFailureDetails failures={failedRows} />}
        </div>
      )}
      <button disabled={importing || rows.length === 0} onClick={importUsers} className="rounded bg-ums-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{importing ? `Importing ${rows.length} accounts…` : `Validate and import ${rows.length} ${importRole === 'student' ? 'students' : 'mentors'}`}</button>
    </div>}
  </section>
}

function ImportFailureDetails({ failures }: { failures: Array<{ rowNumber: number; name: string; identifier: string; reason: string }> }) {
  return (
    <div className="mt-3 max-h-80 overflow-y-auto rounded border border-red-200 bg-white">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-red-100 text-red-900">
          <tr><th className="p-2">Row</th><th className="p-2">Name</th><th className="p-2">Nomatrik / Email</th><th className="p-2">Why it failed</th></tr>
        </thead>
        <tbody className="divide-y divide-red-100">
          {failures.map((failure) => (
            <tr key={`${failure.rowNumber}-${failure.identifier}`}>
              <td className="p-2 align-top">{failure.rowNumber}</td>
              <td className="p-2 align-top font-medium">{failure.name}</td>
              <td className="p-2 align-top">{failure.identifier || '—'}</td>
              <td className="p-2 align-top text-red-800">{failure.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function downloadImportFailures(failures: Array<{ rowNumber: number; name: string; identifier: string; reason: string }>) {
  const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`
  const csv = [
    ['Original row', 'Nama', 'NoMatrik/Email', 'Error reason'],
    ...failures.map((failure) => [String(failure.rowNumber), failure.name, failure.identifier, failure.reason]),
  ].map((row) => row.map(escapeCsv).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'failed-import-rows.csv'
  anchor.click()
  URL.revokeObjectURL(url)
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
    study_status_smp: 'Status SMP',
    lecture_group: 'Kumpulan kuliah',
    residence_college: 'Kolej kediaman',
    room_number: 'No. bilik',
    bka_status: 'Status BKA',
    mentor: 'Mentor',
    job_title: 'Jawatan',
    grade: 'Gred',
    ums_per: 'UMS Per',
  }
  return labels[field]
}

function InlineUserEditor({
  form,
  updateForm,
  onSubmit,
  onCancel,
  isSaving,
}: {
  form: UserForm
  updateForm: (field: keyof UserForm, value: string) => void
  onSubmit: (event: FormEvent) => void
  onCancel: () => void
  isSaving: boolean
}) {
  return (
    <div className="rounded-lg border border-blue-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Edit user details</h3>
          <p className="text-xs text-gray-500">Update the account fields below, then confirm before saving.</p>
        </div>
        <button type="button" onClick={onCancel} className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100">Close</button>
      </div>
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <label className="min-w-40 flex-1 text-xs font-medium text-gray-600">
          Full name
          <input required className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" value={form.name} onChange={(event) => updateForm('name', event.target.value)} />
        </label>
        <label className="min-w-32 text-xs font-medium text-gray-600">
          Role
          <select className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" value={form.role} onChange={(event) => updateForm('role', event.target.value as Role)}>
            <option value="student">Student</option>
            <option value="lecturer">Lecturer</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label className="min-w-48 flex-1 text-xs font-medium text-gray-600">
          Email
          <input type="email" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" value={form.email} onChange={(event) => updateForm('email', event.target.value)} />
        </label>
        <label className="min-w-40 flex-1 text-xs font-medium text-gray-600">
          New password
          <input minLength={8} type="password" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" value={form.password} onChange={(event) => updateForm('password', event.target.value)} placeholder="Leave blank to keep" />
        </label>
        <label className="min-w-36 flex-1 text-xs font-medium text-gray-600">
          Matric / staff ID
          <input className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" value={form.matric_number} onChange={(event) => updateForm('matric_number', event.target.value)} />
        </label>
        <label className="min-w-40 flex-1 text-xs font-medium text-gray-600">
          Programme
          <select className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" value={form.programme} onChange={(event) => updateForm('programme', event.target.value)}>
            <option value="">Select programme</option>
            {PROGRAMME_OPTIONS.map((programme) => (
              <option key={programme.code} value={programme.code}>{programme.code} · {programme.name} · {programme.english}</option>
            ))}
          </select>
        </label>
        <label className="min-w-36 flex-1 text-xs font-medium text-gray-600">
          Phone
          <input className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} />
        </label>
        <div className="flex gap-2">
          <button type="submit" disabled={isSaving} className="rounded bg-ums-blue px-4 py-2 text-sm font-medium text-white hover:bg-ums-blue-light disabled:opacity-50">{isSaving ? 'Saving…' : 'Save changes'}</button>
          <button type="button" onClick={onCancel} className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
        </div>
      </form>
    </div>
  )
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
  async function clearTasks() {
    if (!window.confirm('Clear every task and task submission? This cannot be undone.')) return
    setBusy(true)
    try { await taskService.clearAllTasks(); await queryClient.invalidateQueries({ queryKey: ['admin', 'tasks'] }); onMessage('All tasks cleared.') } catch (err) { onError(err instanceof Error ? err.message : 'Unable to clear tasks.') } finally { setBusy(false) }
  }
  async function clearAnnouncements() {
    if (!window.confirm('Clear every announcement? This cannot be undone.')) return
    setBusy(true)
    try { await announcementService.clearAllAnnouncements(); await queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] }); onMessage('All announcements cleared.') } catch (err) { onError(err instanceof Error ? err.message : 'Unable to clear announcements.') } finally { setBusy(false) }
  }

  return <section className="grid gap-6 lg:grid-cols-2">
    <div className="rounded-lg bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Assignments</h2><button type="button" onClick={clearTasks} disabled={busy} className="text-xs font-medium text-red-600 disabled:opacity-50">Clear all tasks</button></div><select className="mb-2 w-full rounded border px-3 py-2 text-sm" value={selectedLecturerId} onChange={(event) => setLecturerId(event.target.value)}><option value="">Select lecturer</option>{lecturers.map((lecturer) => <option key={lecturer.id} value={lecturer.id}>{lecturer.name}</option>)}</select><input className="mb-2 w-full rounded border px-3 py-2 text-sm" placeholder="Assignment title" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} /><input type="date" className="mb-3 w-full rounded border px-3 py-2 text-sm" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /><LoadingButton loading={busy} loadingLabel="Adding assignment…" disabled={!selectedLecturerId} onClick={createTask} className="rounded bg-ums-blue px-3 py-2 text-sm text-white">Add assignment</LoadingButton><div className="mt-5 space-y-2">{tasks.map((task) => <div key={task.id} className="flex justify-between border-b pb-2 text-sm"><span>{task.title}</span><LoadingButton loading={deletingTaskId === task.id} loadingLabel="Deleting…" onClick={() => removeTask(task.id)} className="text-red-600">Delete</LoadingButton></div>)}</div></div>
    <div className="rounded-lg bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Global announcements</h2><button type="button" onClick={clearAnnouncements} disabled={busy} className="text-xs font-medium text-red-600 disabled:opacity-50">Clear all</button></div><input className="mb-2 w-full rounded border px-3 py-2 text-sm" placeholder="Announcement title" value={title} onChange={(event) => setTitle(event.target.value)} /><textarea className="mb-3 w-full rounded border px-3 py-2 text-sm" rows={4} placeholder="Announcement content" value={content} onChange={(event) => setContent(event.target.value)} /><LoadingButton loading={busy} loadingLabel="Posting announcement…" onClick={createAnnouncement} className="rounded bg-ums-blue px-3 py-2 text-sm text-white">Post announcement</LoadingButton><div className="mt-5 space-y-2">{announcements.map((announcement) => <div key={announcement.id} className="flex justify-between border-b pb-2 text-sm"><span>{announcement.title}{announcement.is_global ? ' (global)' : ''}</span><LoadingButton loading={deletingAnnouncementId === announcement.id} loadingLabel="Deleting…" onClick={() => removeAnnouncement(announcement.id)} className="text-red-600">Delete</LoadingButton></div>)}</div></div>
  </section>
}
