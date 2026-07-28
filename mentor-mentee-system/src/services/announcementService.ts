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

// Student view — announcements from their mentor.
export async function listAnnouncementsByMentor(mentorId: string): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('lecturer_id', mentorId)
    .order('created_at', { ascending: false })
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
