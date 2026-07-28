import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type Task = Database['public']['Tables']['tasks']['Row']
type TaskInsert = Database['public']['Tables']['tasks']['Insert']
type TaskUpdate = Database['public']['Tables']['tasks']['Update']
type Submission = Database['public']['Tables']['task_submissions']['Row']

export async function listTasksByLecturer(lecturerId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('lecturer_id', lecturerId)
    .order('due_date', { ascending: true })
  if (error) throw error
  return data
}

// Student view — tasks set by their mentor.
export async function listTasksByMentor(mentorId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('lecturer_id', mentorId)
    .order('due_date', { ascending: true })
  if (error) throw error
  return data
}

export async function createTask(task: TaskInsert): Promise<Task> {
  const { data, error } = await supabase.from('tasks').insert(task).select().single()
  if (error) throw error
  return data
}

export async function updateTask(id: string, patch: TaskUpdate): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}

export async function listSubmissionsForTask(taskId: string): Promise<Submission[]> {
  const { data, error } = await supabase
    .from('task_submissions')
    .select('*')
    .eq('task_id', taskId)
  if (error) throw error
  return data
}

export async function getMySubmission(
  taskId: string,
  studentId: string,
): Promise<Submission | null> {
  const { data, error } = await supabase
    .from('task_submissions')
    .select('*')
    .eq('task_id', taskId)
    .eq('student_id', studentId)
    .maybeSingle()
  if (error) throw error
  return data
}

// Student submits — upsert so re-submitting before the deadline just updates
// the existing row (matches the unique (task_id, student_id) constraint).
export async function submitTask(params: {
  taskId: string
  studentId: string
  file: string | null
}): Promise<Submission> {
  const { data, error } = await supabase
    .from('task_submissions')
    .upsert(
      {
        task_id: params.taskId,
        student_id: params.studentId,
        file: params.file,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'task_id,student_id' },
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function reviewSubmission(
  id: string,
  patch: { status: Submission['status']; feedback?: string | null },
): Promise<Submission> {
  const { data, error } = await supabase
    .from('task_submissions')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
