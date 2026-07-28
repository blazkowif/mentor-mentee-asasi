import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type UserRow = Database['public']['Tables']['users']['Row']

export async function getMentees(lecturerId: string): Promise<UserRow[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('mentor_id', lecturerId)
    .order('name')
  if (error) throw error
  return data
}

export async function getMentor(mentorId: string | null): Promise<UserRow | null> {
  if (!mentorId) return null
  const { data, error } = await supabase.from('users').select('*').eq('id', mentorId).single()
  if (error) throw error
  return data
}

export async function getProfile(userId: string): Promise<UserRow> {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single()
  if (error) throw error
  return data
}

export async function updateProfile(userId: string, patch: Partial<UserRow>) {
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
  const { data, error } = await supabase.from('users').select('*').order('role').order('name')
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
