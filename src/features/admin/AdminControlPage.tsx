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
import AssignmentPage from './AssignmentPage'

type Role = Database['public']['Enums']['user_role']
type ImportField =
  | 'matric_number' | 'ic_number' | 'name' | 'gender' | 'religion' | 'race'
  | 'phone' | 'programme' | 'channel' | 'address' | 'postcode' | 'city' | 'state'
  | 'study_status' | 'mentor'
type UserForm = {
  name: string
  role: Role
  email: string
  password: string
  matric_number: string
  programme: string
  phone: string
}

const emptyForm: UserForm = {
  name: '',
  role: 'student',
  email: '',
  password: '',
  matric_number: '',
  programme: '',
  phone: '',
}
const importFields: ImportField[] = [
  'matric_number', 'ic_number', 'name', 'gender', 'religion', 'race', 'phone',
  'programme', 'channel', 'address', 'postcode', 'city', 'state', 'study_status', 'mentor',
]
const DELETE_STUDENTS_PHRASE = 'I-hereby-ending-this-session'

export default function AdminControlPage() {
  const currentUser = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab')
  const [tab, setTab] = useState<'users' | 'assignment' | 'import' | 'content'>(
    initialTab === 'assignment' || initialTab === 'import' || initialTab === 'content' ? initialTab : 'users',
  )
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteStudents, setShowDeleteStudents] = useState(false)
  const [deleteStudentsPhrase, setDeleteStudentsPhrase] = useState('')

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
        email: form.email.trim(),
        password: form.password || undefined,
        matric_number: form.matric_number.trim() || null,
        programme: form.programme.trim() || null,
        phone: form.phone.trim() || null,
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
    mutationFn: () => adminService.deleteAllStudents(deleteStudentsPhrase),
    onSuccess: (deleted) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() })
      setDeleteStudentsPhrase('')
      setShowDeleteStudents(false)
      setMessage(`${deleted} student account${deleted === 1 ? '' : 's'} deleted.`)
      setError(null)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Unable to delete all students.'),
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
      programme: user.programme ?? '',
      phone: user.phone ?? '',
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
        <h1 className="text-lg font-semibold text-gray-900">Admin control center</h1>
        <p className="text-sm text-gray-500">Manage accounts, assignments, tasks, and announcements from one place.</p>
      </div>
      <nav className="flex flex-wrap gap-2 border-b border-gray-200">
        {([
          ['users', 'Users & passwords'],
          ['assignment', 'Reassign mentors'],
          ['import', 'Excel import'],
          ['content', 'Tasks & announcements'],
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
                      <td className="p-2 text-xs">{user.email ?? '—'}</td>
                      <td className="p-2"><div className="flex gap-2"><button className="text-ums-blue hover:underline" onClick={() => editUser(user)}>Edit</button><button className="text-red-600 hover:underline disabled:opacity-40" disabled={user.id === currentUser?.id} onClick={() => { if (window.confirm(`Delete ${user.name}?`)) deleteUser.mutate(user.id) }}>Delete</button></div></td>
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
                Delete all students ({users.filter((user) => user.role === 'student').length})
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
                  <button
                    type="button"
                    disabled={deleteStudentsPhrase !== DELETE_STUDENTS_PHRASE || deleteAllStudents.isPending}
                    onClick={() => deleteAllStudents.mutate()}
                    className="rounded bg-red-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {deleteAllStudents.isPending ? 'Deleting students…' : 'Confirm permanent deletion'}
                  </button>
                </div>
              </div>
            )}
          </div>
          <form onSubmit={submitUser} className="rounded-lg bg-white p-4 shadow-sm">
            <h2 className="mb-3 font-semibold">{editingId ? 'Edit user' : 'Add user'}</h2>
            <div className="space-y-3">
              <label className="block text-xs font-medium text-gray-600">Full name<input required className="mt-1 w-full rounded border px-3 py-2 text-sm" value={form.name} onChange={(event) => updateForm('name', event.target.value)} /></label>
              <label className="block text-xs font-medium text-gray-600">Role<select className="mt-1 w-full rounded border px-3 py-2 text-sm" value={form.role} onChange={(event) => updateForm('role', event.target.value)}><option value="student">Student</option><option value="lecturer">Lecturer</option><option value="admin">Admin</option></select></label>
              <label className="block text-xs font-medium text-gray-600">Email / login email<input required type="email" className="mt-1 w-full rounded border px-3 py-2 text-sm" value={form.email} onChange={(event) => updateForm('email', event.target.value)} /></label>
              <label className="block text-xs font-medium text-gray-600">{editingId ? 'New password (leave blank to keep current)' : 'Password'}<input required={!editingId} minLength={8} type="password" className="mt-1 w-full rounded border px-3 py-2 text-sm" value={form.password} onChange={(event) => updateForm('password', event.target.value)} /></label>
              <label className="block text-xs font-medium text-gray-600">Matric / staff ID<input className="mt-1 w-full rounded border px-3 py-2 text-sm" value={form.matric_number} onChange={(event) => updateForm('matric_number', event.target.value)} /></label>
              <label className="block text-xs font-medium text-gray-600">Programme<input className="mt-1 w-full rounded border px-3 py-2 text-sm" value={form.programme} onChange={(event) => updateForm('programme', event.target.value)} /></label>
              <label className="block text-xs font-medium text-gray-600">Phone<input className="mt-1 w-full rounded border px-3 py-2 text-sm" value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} /></label>
            </div>
            <button disabled={saveUser.isPending} className="mt-4 w-full rounded bg-ums-blue px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{saveUser.isPending ? 'Saving…' : editingId ? 'Save changes' : 'Create user'}</button>
          </form>
        </section>
      )}

      {tab === 'import' && <SpreadsheetImport onComplete={() => queryClient.invalidateQueries({ queryKey: queryKeys.users.all() })} onMessage={setMessage} onError={setError} />}
      {tab === 'assignment' && <AssignmentPage />}
      {tab === 'content' && <ContentManager users={users} tasks={tasksQuery.data ?? []} announcements={announcementsQuery.data ?? []} adminId={currentUser?.id ?? ''} onMessage={setMessage} onError={setError} />}
    </div>
  )
}

function SpreadsheetImport({ onComplete, onMessage, onError }: { onComplete: () => void; onMessage: (value: string) => void; onError: (value: string) => void }) {
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Partial<Record<ImportField, string>>>({})
  const [defaultPassword, setDefaultPassword] = useState('')
  const [passwordColumn, setPasswordColumn] = useState('')
  const [role, setRole] = useState<Role>('student')
  const [importing, setImporting] = useState(false)

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
    if (!nameColumn || !matricColumn || !passwordColumn) {
      onError('Map Nomatrik and Nama, then choose a password column.')
      return
    }
    setImporting(true)
    try {
      let imported = 0
      const failures: string[] = []
      for (const [index, row] of rows.entries()) {
        const rowNumber = index + 2
        try {
          const name = row[nameColumn].trim()
          const matricNumber = row[matricColumn].trim()
          const email = `${matricNumber.toLowerCase().replace(/[^a-z0-9]+/g, '')}@student.local`
          const password = row[passwordColumn].trim() || defaultPassword.trim()
          if (!name || !matricNumber || !email || !password) {
            throw new Error('Nomatrik, Nama, and the selected password value are required.')
          }
          if (password.length < 8) {
            throw new Error('Password must contain at least 8 characters.')
          }
          const mentorValue = mapping.mentor ? row[mapping.mentor].trim() : ''
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
            role,
            email,
            password,
            matric_number: matricNumber,
            mentor_id: mentorId,
            ic_number: mapping.ic_number ? row[mapping.ic_number] || null : null,
            gender: mapping.gender ? row[mapping.gender] || null : null,
            religion: mapping.religion ? row[mapping.religion] || null : null,
            race: mapping.race ? row[mapping.race] || null : null,
            phone: mapping.phone ? row[mapping.phone] || null : null,
            programme: mapping.programme ? row[mapping.programme] || null : null,
            address: mapping.address ? row[mapping.address] || null : null,
            postcode: mapping.postcode ? row[mapping.postcode] || null : null,
            city: mapping.city ? row[mapping.city] || null : null,
            state: mapping.state ? row[mapping.state] || null : null,
            study_status: mapping.study_status ? row[mapping.study_status] || null : null,
            channel: mapping.channel ? row[mapping.channel] || null : null,
          })
          imported += 1
        } catch (err) {
          failures.push(`Row ${rowNumber} (${row[nameColumn] || 'unnamed'}): ${err instanceof Error ? err.message : 'unknown error'}`)
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
    <h2 className="font-semibold">Import users from Excel</h2>
    <p className="mb-4 text-sm text-gray-500">Upload the student file, map the requested fields, and choose which column supplies each password. KP is selected automatically when that header exists. Login emails are generated from Nomatrik because this format has no email column.</p>
    <input type="file" accept=".xlsx,.xls,.csv" onChange={readFile} className="mb-4 block text-sm" />
    {headers.length > 0 && <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">Role for this import<select className="mt-1 w-full rounded border px-3 py-2" value={role} onChange={(event) => setRole(event.target.value as Role)}><option value="student">Student</option><option value="lecturer">Lecturer</option><option value="admin">Admin</option></select></label>
      <label className="block text-sm font-medium text-gray-700">Password column<select className="mt-1 w-full rounded border px-3 py-2" value={passwordColumn} onChange={(event) => setPasswordColumn(event.target.value)}><option value="">Choose a column</option>{headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label>
      {importFields.map((field) => <label key={field} className="flex items-center gap-3 text-sm"><span className="w-32">{field === 'matric_number' ? 'Nomatrik' : field === 'ic_number' ? 'KP' : field.replace('_', ' ')}</span><select className="flex-1 rounded border px-2 py-1.5" value={mapping[field] ?? ''} onChange={(event) => setMapping((previous) => ({ ...previous, [field]: event.target.value || undefined }))}><option value="">Do not import</option>{headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label>)}
      <label className="block text-sm">Fallback password (optional; used only when a row's selected password is blank)<input type="password" minLength={8} className="mt-1 w-full rounded border px-3 py-2" value={defaultPassword} onChange={(event) => setDefaultPassword(event.target.value)} /></label>
      <button disabled={importing || rows.length === 0} onClick={importUsers} className="rounded bg-ums-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{importing ? `Importing ${rows.length} users…` : `Import ${rows.length} users`}</button>
    </div>}
  </section>
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
    try { await taskService.deleteTask(id); await queryClient.invalidateQueries({ queryKey: ['admin', 'tasks'] }); onMessage('Assignment deleted.') } catch (err) { onError(err instanceof Error ? err.message : 'Unable to delete assignment.') }
  }
  async function removeAnnouncement(id: string) {
    try { await announcementService.deleteAnnouncement(id); await queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] }); onMessage('Announcement deleted.') } catch (err) { onError(err instanceof Error ? err.message : 'Unable to delete announcement.') }
  }

  return <section className="grid gap-6 lg:grid-cols-2">
    <div className="rounded-lg bg-white p-4 shadow-sm"><h2 className="mb-3 font-semibold">Assignments</h2><select className="mb-2 w-full rounded border px-3 py-2 text-sm" value={selectedLecturerId} onChange={(event) => setLecturerId(event.target.value)}><option value="">Select lecturer</option>{lecturers.map((lecturer) => <option key={lecturer.id} value={lecturer.id}>{lecturer.name}</option>)}</select><input className="mb-2 w-full rounded border px-3 py-2 text-sm" placeholder="Assignment title" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} /><input type="date" className="mb-3 w-full rounded border px-3 py-2 text-sm" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /><button disabled={busy || !selectedLecturerId} onClick={createTask} className="rounded bg-ums-blue px-3 py-2 text-sm text-white disabled:opacity-50">Add assignment</button><div className="mt-5 space-y-2">{tasks.map((task) => <div key={task.id} className="flex justify-between border-b pb-2 text-sm"><span>{task.title}</span><button className="text-red-600" onClick={() => removeTask(task.id)}>Delete</button></div>)}</div></div>
    <div className="rounded-lg bg-white p-4 shadow-sm"><h2 className="mb-3 font-semibold">Global announcements</h2><input className="mb-2 w-full rounded border px-3 py-2 text-sm" placeholder="Announcement title" value={title} onChange={(event) => setTitle(event.target.value)} /><textarea className="mb-3 w-full rounded border px-3 py-2 text-sm" rows={4} placeholder="Announcement content" value={content} onChange={(event) => setContent(event.target.value)} /><button disabled={busy} onClick={createAnnouncement} className="rounded bg-ums-blue px-3 py-2 text-sm text-white">Post announcement</button><div className="mt-5 space-y-2">{announcements.map((announcement) => <div key={announcement.id} className="flex justify-between border-b pb-2 text-sm"><span>{announcement.title}{announcement.is_global ? ' (global)' : ''}</span><button className="text-red-600" onClick={() => removeAnnouncement(announcement.id)}>Delete</button></div>)}</div></div>
  </section>
}
