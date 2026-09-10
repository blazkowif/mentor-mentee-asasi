import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type UserRow = Database['public']['Tables']['users']['Row']
export type ProfilePatch = Partial<Pick<UserRow, 'name' | 'phone' | 'address' | 'motto' | 'profile_image'>>
const SAFE_USER_FIELDS = 'id, role, matric_number, name, programme, mentor_id, email, phone, profile_image, address, motto, created_at'

export async function getMentees(lecturerId: string): Promise<UserRow[]> {
  const { data, error } = await supabase
    .from('users')
    .select(SAFE_USER_FIELDS)
    .eq('mentor_id', lecturerId)
    .order('name')
  if (error) throw error
  return data
}

export async function getMentor(mentorId: string | null): Promise<UserRow | null> {
  if (!mentorId) return null
  const { data, error } = await supabase.from('users').select(SAFE_USER_FIELDS).eq('id', mentorId).single()
  if (error) throw error
  return data
}

export async function getProfile(userId: string): Promise<UserRow> {
  const { data, error } = await supabase.from('users').select(SAFE_USER_FIELDS).eq('id', userId).single()
  if (error) throw error
  return data
}

export async function updateProfile(userId: string, patch: ProfilePatch) {
  const { data, error } = await supabase
    .from('users')
    .update(patch)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

// --- Admin only (guarded by RLS server-side; UI should also hide these) ---

export async function listAllUsers(): Promise<UserRow[]> {
  const { data, error } = await supabase.from('users').select(SAFE_USER_FIELDS).order('role').order('name')
  if (error) throw error
  return data
}

export async function assignMentor(studentId: string, mentorId: string | null) {
  const { data, error } = await supabase
    .from('users')
    .update({ mentor_id: mentorId })
    .eq('id', studentId)
    .select()
    .single()
  if (error) throw error
  return data
}
