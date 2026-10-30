import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type Note = Database['public']['Tables']['mentor_notes']['Row']
type Flag = Database['public']['Tables']['student_attention_flags']['Row']
type FollowUp = Database['public']['Tables']['admin_follow_up_notes']['Row']
type NoteInsert = Database['public']['Tables']['mentor_notes']['Insert']
type FlagInsert = Database['public']['Tables']['student_attention_flags']['Insert']

export async function listMentorNotes(studentId?: string): Promise<Note[]> {
  let query = supabase.from('mentor_notes').select('*').is('archived_at', null).order('created_at', { ascending: false })
  if (studentId) query = query.eq('student_id', studentId)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function createMentorNote(note: NoteInsert): Promise<Note> {
  const { data, error } = await supabase.from('mentor_notes').insert(note).select().single()
  if (error) throw error
  return data
}

export async function listAttentionFlags(studentId?: string): Promise<Flag[]> {
  let query = supabase.from('student_attention_flags').select('*').order('created_at', { ascending: false })
  if (studentId) query = query.eq('student_id', studentId)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function createAttentionFlag(flag: FlagInsert): Promise<Flag> {
  const { data, error } = await supabase.from('student_attention_flags').insert(flag).select().single()
  if (error) throw error
  return data
}

export async function updateAttentionFlag(
  id: string,
  patch: Database['public']['Tables']['student_attention_flags']['Update'],
): Promise<Flag> {
  const { data, error } = await supabase.from('student_attention_flags').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function listFollowUpNotes(flagId: string): Promise<FollowUp[]> {
  const { data, error } = await supabase
    .from('admin_follow_up_notes')
    .select('*')
    .eq('attention_flag_id', flagId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function addFollowUpNote(flagId: string, adminId: string, note: string): Promise<FollowUp> {
  const { data, error } = await supabase
    .from('admin_follow_up_notes')
    .insert({ attention_flag_id: flagId, admin_id: adminId, note })
    .select()
    .single()
  if (error) throw error
  return data
}
