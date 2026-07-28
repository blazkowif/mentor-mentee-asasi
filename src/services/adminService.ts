import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'
import type { UserRole } from '@/types/database.types'

export type UserRow = Database['public']['Tables']['users']['Row']
export type Programmes = 'Asasi Sains' | 'Asasi Teknologi' | 'Asasi Agrisains' | 'Asasi Sains Sosial'

export async function getStudentsByProgramme(programme?: string): Promise<UserRow[]> {
  let q = supabase
    .from('users')
    .select('*')
    .eq('role', 'student')
    .order('name')
  if (programme) q = q.eq('programme', programme)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function getAvailableMentors(): Promise<UserRow[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'lecturer')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function searchUsers(query: string): Promise<UserRow[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .or(`name.ilike.%${query}%,email.ilike.%${query}%,matric_number.ilike.%${query}%`)
    .order('role')
    .order('name')
  if (error) throw error
  return data ?? []
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
  const { error: upErr } = await supabase.from('users').upsert(updated, { count: 'exact' })
  if (upErr) throw upErr
  return { assigned: updated.length }
}
