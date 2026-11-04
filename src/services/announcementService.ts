import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type Announcement = Database['public']['Tables']['announcements']['Row']
type AnnouncementInsert = Database['public']['Tables']['announcements']['Insert']

export async function listAnnouncementsByLecturer(lecturerId: string): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('lecturer_id', lecturerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function listAllAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// Student view — announcements from their mentor.
export async function listAnnouncementsByMentor(mentorId: string | null): Promise<Announcement[]> {
  let query = supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })
  query = mentorId
    ? query.or(`lecturer_id.eq.${mentorId},is_global.eq.true,target_role.eq.lecturer`)
    : query.eq('is_global', true)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function listAnnouncementsForStudent(studentId: string, mentorId: string | null): Promise<Announcement[]> {
  let query = supabase.from('announcements').select('*').order('created_at', { ascending: false })
  query = mentorId
    ? query.or(`lecturer_id.eq.${mentorId},is_global.eq.true,target_role.eq.student,target_student_id.eq.${studentId}`)
    : query.or(`is_global.eq.true,target_role.eq.student,target_student_id.eq.${studentId}`)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createAnnouncement(
  announcement: AnnouncementInsert,
): Promise<Announcement> {
  const { data, error } = await supabase
    .from('announcements')
    .insert(announcement)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteAnnouncement(id: string) {
  const { error } = await supabase.from('announcements').delete().eq('id', id)
  if (error) throw error
}

export async function updateAnnouncement(id: string, patch: Database['public']['Tables']['announcements']['Update']): Promise<Announcement> {
  const { data, error } = await supabase.from('announcements').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}
