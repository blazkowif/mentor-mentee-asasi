import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type MeetingTask = Database['public']['Tables']['meeting_tasks']['Row']
export type MeetingAssignment = Database['public']['Tables']['meeting_assignments']['Row']
export type MeetingReport = Database['public']['Tables']['meeting_reports']['Row']
export type PublicMeetingReport = Database['public']['Functions']['get_public_meeting_report']['Returns'][number]

export async function listMeetingTasks(): Promise<MeetingTask[]> {
  const { data, error } = await supabase
    .from('meeting_tasks')
    .select('*')
    .order('meeting_number', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createMeetingTask(task: Database['public']['Tables']['meeting_tasks']['Insert']) {
  const { data, error } = await supabase.from('meeting_tasks').insert(task).select().single()
  if (error) throw error
  return data
}

export function nextMeetingNumber(tasks: MeetingTask[]) {
  return tasks.reduce((highest, task) => Math.max(highest, task.meeting_number), 0) + 1
}

export async function listAssignments(mentorId?: string, studentId?: string): Promise<MeetingAssignment[]> {
  let query = supabase.from('meeting_assignments').select('*').order('assigned_at', { ascending: false })
  if (mentorId) query = query.eq('mentor_id', mentorId)
  if (studentId) query = query.eq('student_id', studentId)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function assignStudent(params: {
  meetingTaskId: string
  mentorId: string
  studentId: string
}) {
  const { data, error } = await supabase
    .from('meeting_assignments')
    .insert({
      meeting_task_id: params.meetingTaskId,
      mentor_id: params.mentorId,
      student_id: params.studentId,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function listReports(): Promise<MeetingReport[]> {
  const { data, error } = await supabase
    .from('meeting_reports')
    .select('*')
    .order('completed_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function saveReport(params: {
  assignmentId: string
  mentorId: string
  studentId: string
  overallSummary: string
  needsAttention: boolean
  attentionRemark: string | null
}) {
  const { data, error } = await supabase
    .from('meeting_reports')
    .upsert(
      {
        meeting_assignment_id: params.assignmentId,
        mentor_id: params.mentorId,
        student_id: params.studentId,
        overall_summary: params.overallSummary,
        needs_attention: params.needsAttention,
        attention_remark: params.needsAttention ? params.attentionRemark : null,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'meeting_assignment_id' },
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function assignMeetingToMentor(meetingTaskId: string, mentorId: string) {
  const { data, error } = await supabase.rpc('assign_meeting_to_mentor', {
    p_meeting_task_id: meetingTaskId,
    p_mentor_id: mentorId,
  })
  if (error) throw error
  return data
}

export async function getPublicMeetingReport(reportToken: string): Promise<PublicMeetingReport[]> {
  const { data, error } = await supabase.rpc('get_public_meeting_report', {
    p_report_token: reportToken,
  })
  if (error) throw error
  return data ?? []
}

export async function savePublicMeetingReport(params: {
  reportToken: string
  overallSummary: string
  studentReports: Array<{
    assignment_id: string
    student_comment: string
    needs_attention: boolean
    attention_remark: string | null
  }>
}) {
  const { error } = await supabase.rpc('save_public_meeting_report', {
    p_report_token: params.reportToken,
    p_overall_summary: params.overallSummary,
    p_student_reports: params.studentReports,
  })
  if (error) throw error
}
