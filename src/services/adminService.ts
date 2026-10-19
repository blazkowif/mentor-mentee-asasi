import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type UserRow = Database['public']['Tables']['users']['Row']
export type Programmes = 'Asasi Sains' | 'Asasi Teknologi' | 'Asasi Agrisains' | 'Asasi Sains Sosial'
export type UserInput = {
  name: string
  role: Database['public']['Enums']['user_role']
  matric_number?: string | null
  email: string
  password?: string
  programme?: string | null
  phone?: string | null
  mentor_id?: string | null
  ic_number?: string | null
  gender?: string | null
  religion?: string | null
  race?: string | null
  address?: string | null
  postcode?: string | null
  city?: string | null
  state?: string | null
  study_status?: string | null
  channel?: string | null
}
export type AuthUserAction = 'create' | 'update' | 'delete' | 'delete_all_students'
const SAFE_USER_FIELDS = 'id, role, matric_number, name, gender, religion, race, programme, mentor_id, email, phone, profile_image, address, postcode, city, state, study_status, channel, motto, created_at'

export async function listAllUsers(): Promise<UserRow[]> {
  const { data, error } = await supabase
    .from('users')
    .select(SAFE_USER_FIELDS)
      .order('role')
      .order('name')
      .limit(2000)
  if (error) throw error
  return data ?? []
}

export async function getStudentsByProgramme(programme?: string): Promise<UserRow[]> {
  let q = supabase
    .from('users')
    .select(SAFE_USER_FIELDS)
    .eq('role', 'student')
    .order('name')
      .limit(2000)
  if (programme) q = q.eq('programme', programme)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function getAvailableMentors(): Promise<UserRow[]> {
  const { data, error } = await supabase
    .from('users')
    .select(SAFE_USER_FIELDS)
    .eq('role', 'lecturer')
    .order('name')
      .limit(2000)
  if (error) throw error
  return data ?? []
}

export async function searchUsers(query: string): Promise<UserRow[]> {
  const safeQuery = query.trim().replace(/[%,.()_]/g, '')
  if (!safeQuery) return []
  const { data, error } = await supabase
    .from('users')
    .select('id, role, matric_number, name, programme, mentor_id, email, phone, profile_image, address, motto, created_at')
    .or(`name.ilike.%${safeQuery}%,email.ilike.%${safeQuery}%,matric_number.ilike.%${safeQuery}%`)
    .order('role')
    .order('name')
    .limit(50)
  if (error) throw error
  return data ?? []
}

export async function findUserByIdentifier(identifier: string): Promise<UserRow | null> {
  const value = identifier.trim()
  if (!value) return null
  const fields = [
    ['id', value],
    ['email', value],
    ['matric_number', value],
    ['name', value],
  ] as const
  for (const [field, candidate] of fields) {
    const { data, error } = await supabase
      .from('users')
      .select(SAFE_USER_FIELDS)
      .eq(field, candidate)
      .limit(2)
    if (error) throw error
    if (data?.length === 1) return data[0]
    if (data && data.length > 1) throw new Error(`Mentor value "${value}" matches more than one user.`)
  }
  return null
}

export async function getUserActivity(userId: string, limit = 20): Promise<any[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function bulkAssignMentors(studentIds: string[], mentorId: string | null) {
  const { data, error } = await supabase
    .from('users')
    .update({ mentor_id: mentorId })
    .in('id', studentIds)
    .select('id')
  if (error) throw error
  return data ?? []
}

async function invokeAuthAdmin(
  action: AuthUserAction,
  user?: Partial<UserInput> & { id?: string; confirmation?: string },
) {
  const { data, error } = await supabase.functions.invoke('admin-user', {
    body: { action, user },
  })
  if (error) throw error
  return data as { user?: UserRow; deleted?: number }
}

export async function createManagedUser(user: UserInput): Promise<UserRow> {
  const result = await invokeAuthAdmin('create', user)
  if (!result.user) throw new Error('Admin function did not return the created user.')
  return result.user
}

export async function updateManagedUser(id: string, user: Partial<UserInput>): Promise<UserRow> {
  const result = await invokeAuthAdmin('update', { ...user, id })
  if (!result.user) throw new Error('Admin function did not return the updated user.')
  return result.user
}

export async function deleteManagedUser(id: string) {
  await invokeAuthAdmin('delete', { id })
}

export async function deleteAllStudents(confirmation: string): Promise<number> {
  const result = await invokeAuthAdmin('delete_all_students', { confirmation })
  return result.deleted ?? 0
}

export async function listAllTasks() {
  const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function listAllAnnouncements() {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createGlobalAnnouncement(adminId: string, title: string, content: string) {
  const { data, error } = await supabase
    .from('announcements')
    .insert({ lecturer_id: adminId, title, content, is_global: true })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function autoAssignMentors(options?: { programme?: string }) {
  let query = supabase
    .from('users')
    .select('id')
    .eq('role', 'student')
    .is('mentor_id', null)
  if (options?.programme) query = query.eq('programme', options.programme)
  const { data: orphanStudents, error: selErr } = await query
  if (selErr) throw selErr
  if (!orphanStudents?.length) return { assigned: 0 }
  const {
    data: lecturerIds,
    error: lErr,
  } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'lecturer')
  if (lErr) throw lErr
  if (!lecturerIds?.length) return { assigned: 0 }
  const ids = lecturerIds.map((r) => r.id)
  const updated = orphanStudents.map((s) => ({
    id: s.id,
    mentor_id: ids[Math.floor(Math.random() * ids.length)],
  }))
  const { error: upErr } = await supabase
    .from('users')
    .upsert(updated as any[], { count: 'exact' })
  if (upErr) throw upErr
  return { assigned: updated.length }
}
