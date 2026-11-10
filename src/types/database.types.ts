// Hand-authored to match supabase/migrations/0001_init.sql, in the shape
// @supabase/supabase-js expects (Tables need Relationships; the schema needs
// Views/Functions even when empty). Once the project is linked, replace with
// the generated types:
//   npx supabase gen types typescript --project-id <ref> > src/types/database.types.ts

export type UserRole = 'student' | 'lecturer' | 'admin'
export type TaskPriority = 'low' | 'medium' | 'high'
export type SubmissionStatus = 'pending' | 'submitted' | 'reviewed' | 'completed'
export type MentorNoteCategory = 'general' | 'academic' | 'attendance' | 'welfare' | 'behaviour' | 'financial' | 'follow_up' | 'other'
export type AttentionSeverity = 'monitor' | 'needs_attention' | 'urgent'
export type AttentionStatus = 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed'

export interface Database {
  public: {
    Tables: {
      users: {
  Row: {
    id: string
    role: UserRole
    matric_number: string | null
    ic_number: string | null
    name: string
    gender: string | null
    religion: string | null
    race: string | null
    programme: string | null
    mentor_id: string | null
    email: string | null
    phone: string | null
    address: string | null
    postcode: string | null
    city: string | null
    state: string | null
    study_status: string | null
    study_status_smp: string | null
    lecture_group: string | null
    residence_college: string | null
    room_number: string | null
    bka_status: string | null
    channel: string | null
    profile_image: string | null
    motto: string | null
    job_title: string | null
    grade: string | null
    ums_per: string | null
    created_at: string
  }
        Insert: Partial<Database['public']['Tables']['users']['Row']> & {
          id: string
          role: UserRole
          name: string
        }
        Update: Partial<Database['public']['Tables']['users']['Row']>
        Relationships: [
          {
            foreignKeyName: 'users_mentor_id_fkey'
            columns: ['mentor_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      mentor_groups: {
        Row: {
          id: string
          lecturer_id: string
          group_name: string
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['mentor_groups']['Row']> & {
          lecturer_id: string
          group_name: string
        }
        Update: Partial<Database['public']['Tables']['mentor_groups']['Row']>
        Relationships: [
          {
            foreignKeyName: 'mentor_groups_lecturer_id_fkey'
            columns: ['lecturer_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string | null
          group_id: string | null
          message: string | null
          attachment: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['messages']['Row']> & {
          sender_id: string
        }
        Update: Partial<Database['public']['Tables']['messages']['Row']>
        Relationships: [
          {
            foreignKeyName: 'messages_sender_id_fkey'
            columns: ['sender_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_receiver_id_fkey'
            columns: ['receiver_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_group_id_fkey'
            columns: ['group_id']
            referencedRelation: 'mentor_groups'
            referencedColumns: ['id']
          },
        ]
      }
      announcements: {
        Row: {
          id: string
          lecturer_id: string
          is_global: boolean
          title: string
          content: string | null
          attachment: string | null
          target_role: UserRole | null
          target_student_id: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['announcements']['Row']> & {
          lecturer_id: string
          title: string
        }
        Update: Partial<Database['public']['Tables']['announcements']['Row']>
        Relationships: [
          {
            foreignKeyName: 'announcements_lecturer_id_fkey'
            columns: ['lecturer_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      tasks: {
        Row: {
          id: string
          lecturer_id: string
          title: string
          description: string | null
          due_date: string | null
          attachment: string | null
          priority: TaskPriority
          target_role: UserRole | null
          target_student_id: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['tasks']['Row']> & {
          lecturer_id: string
          title: string
        }
        Update: Partial<Database['public']['Tables']['tasks']['Row']>
        Relationships: [
          {
            foreignKeyName: 'tasks_lecturer_id_fkey'
            columns: ['lecturer_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      task_submissions: {
        Row: {
          id: string
          task_id: string
          student_id: string
          file: string | null
          status: SubmissionStatus
          feedback: string | null
          submitted_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['task_submissions']['Row']> & {
          task_id: string
          student_id: string
        }
        Update: Partial<Database['public']['Tables']['task_submissions']['Row']>
        Relationships: [
          {
            foreignKeyName: 'task_submissions_task_id_fkey'
            columns: ['task_id']
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_submissions_student_id_fkey'
            columns: ['student_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          body: string | null
          is_read: boolean
          created_at: string
          reference_type: string | null
          reference_id: string | null
        }
        Insert: Partial<Database['public']['Tables']['notifications']['Row']> & {
          user_id: string
          title: string
        }
        Update: Partial<Database['public']['Tables']['notifications']['Row']>
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          timestamp: string
        }
        Insert: Partial<Database['public']['Tables']['activity_logs']['Row']> & {
          user_id: string
          action: string
        }
        Update: Partial<Database['public']['Tables']['activity_logs']['Row']>
        Relationships: [
          {
            foreignKeyName: 'activity_logs_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      mentor_notes: {
        Row: {
          id: string
          student_id: string
          mentor_id: string
          category: MentorNoteCategory
          note: string
          created_at: string
          updated_at: string
          archived_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['mentor_notes']['Row']> & {
          student_id: string
          mentor_id: string
          note: string
        }
        Update: Partial<Database['public']['Tables']['mentor_notes']['Row']>
        Relationships: []
      }
      student_attention_flags: {
        Row: {
          id: string
          student_id: string
          mentor_id: string
          severity: AttentionSeverity
          reason: string
          status: AttentionStatus
          created_at: string
          updated_at: string
          acknowledged_at: string | null
          acknowledged_by: string | null
          resolved_at: string | null
          resolved_by: string | null
          resolution_note: string | null
        }
        Insert: Partial<Database['public']['Tables']['student_attention_flags']['Row']> & {
          student_id: string
          mentor_id: string
          severity: AttentionSeverity
          reason: string
        }
        Update: Partial<Database['public']['Tables']['student_attention_flags']['Row']>
        Relationships: []
      }
      admin_follow_up_notes: {
        Row: {
          id: string
          attention_flag_id: string
          admin_id: string
          note: string
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['admin_follow_up_notes']['Row']> & {
          attention_flag_id: string
          admin_id: string
          note: string
        }
        Update: Partial<Database['public']['Tables']['admin_follow_up_notes']['Row']>
        Relationships: []
      }
      internal_staff_notes: {
        Row: {
          id: string
          target_user_id: string
          author_id: string
          note: string
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['internal_staff_notes']['Row']> & {
          target_user_id: string
          author_id: string
          note: string
        }
        Update: Partial<Database['public']['Tables']['internal_staff_notes']['Row']>
        Relationships: []
      }
      meeting_tasks: {
        Row: {
          id: string
          created_by: string
          meeting_number: number
          title: string
          instructions: string | null
          scheduled_start: string | null
          scheduled_end: string | null
          report_token: string
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['meeting_tasks']['Row']> & {
          created_by: string
          meeting_number: number
          title: string
        }
        Update: Partial<Database['public']['Tables']['meeting_tasks']['Row']>
        Relationships: []
      }
      meeting_assignments: {
        Row: {
          id: string
          meeting_task_id: string
          mentor_id: string
          student_id: string
          assigned_at: string
        }
        Insert: Partial<Database['public']['Tables']['meeting_assignments']['Row']> & {
          meeting_task_id: string
          mentor_id: string
          student_id: string
        }
        Update: Partial<Database['public']['Tables']['meeting_assignments']['Row']>
        Relationships: []
      }
      meeting_reports: {
        Row: {
          id: string
          meeting_assignment_id: string
          mentor_id: string
          student_id: string
          overall_summary: string
          student_comment: string
          needs_attention: boolean
          attention_remark: string | null
          is_submitted: boolean
          completed_at: string
        }
        Insert: Partial<Database['public']['Tables']['meeting_reports']['Row']> & {
          meeting_assignment_id: string
          mentor_id: string
          student_id: string
          overall_summary: string
        }
        Update: Partial<Database['public']['Tables']['meeting_reports']['Row']>
        Relationships: []
      }
      meeting_report_comments: {
        Row: {
          id: string
          meeting_assignment_id: string
          mentor_id: string
          comment: string
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['meeting_report_comments']['Row']> & {
          meeting_assignment_id: string
          mentor_id: string
          comment: string
        }
        Update: never
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      get_login_email: {
        Args: { p_matric_number: string }
        Returns: string
      }
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      current_user_role: {
        Args: Record<string, never>
        Returns: UserRole
      }
      current_mentor_id: {
        Args: Record<string, never>
        Returns: string
      }
      search_chat_users: {
        Args: { p_query: string }
        Returns: Array<{
          id: string
          role: UserRole
          matric_number: string | null
          name: string
          email: string | null
          programme: string | null
          profile_image: string | null
        }>
      }
      clear_all_chat_history: {
       Args: Record<string, never>
       Returns: number
      }
      list_chat_groups: {
        Args: Record<string, never>
        Returns: Array<{
          id: string
          lecturer_id: string
          group_name: string
          created_at: string
          is_current: boolean
        }>
      }
      list_mentor_group_members: {
        Args: { p_group_id: string }
        Returns: Array<{
          id: string
          name: string
          role: UserRole
          matric_number: string | null
          programme: string | null
          email: string | null
          phone: string | null
          address: string | null
          motto: string | null
          profile_image: string | null
        }>
      }
      list_pinned_chat_contacts: {
        Args: Record<string, never>
        Returns: Array<{
          id: string
          role: UserRole
          matric_number: string | null
          name: string
          email: string | null
          programme: string | null
          profile_image: string | null
          contact_type: string
        }>
      }
      list_chat_contacts: {
        Args: Record<string, never>
        Returns: Array<{
          id: string
          role: UserRole
          matric_number: string | null
          name: string
          programme: string | null
          profile_image: string | null
          contact_type: string
          last_message_at: string | null
          unread_count: number
        }>
      }
      mark_chat_read: {
        Args: { p_contact_id: string }
        Returns: undefined
      }
      get_chat_profile: {
        Args: { p_user_id: string }
        Returns: Array<{
          id: string
          role: UserRole
          matric_number: string | null
          name: string
          programme: string | null
          email: string | null
          phone: string | null
          address: string | null
          motto: string | null
          profile_image: string | null
        }>
      }
      clear_all_chat_history_v2: {
        Args: Record<string, never>
        Returns: number
      }
      send_personal_message: {
        Args: {
          p_receiver_id: string
          p_message: string
          p_attachment?: string | null
        }
        Returns: Database['public']['Tables']['messages']['Row']
      }
      assign_meeting_to_mentor: {
        Args: { p_meeting_task_id: string; p_mentor_id: string }
        Returns: number
      }
      assign_meeting_to_all_mentors: {
        Args: { p_meeting_task_id: string; p_report_url: string }
        Returns: number
      }
      add_meeting_report_comment: {
        Args: { p_assignment_id: string; p_comment: string }
        Returns: Database['public']['Tables']['meeting_report_comments']['Row']
      }
      get_public_meeting_report: {
        Args: { p_report_token: string }
        Returns: Array<{
          meeting_task_id: string
          meeting_number: number
          title: string
          instructions: string | null
          scheduled_start: string | null
          scheduled_end: string | null
          mentor_id: string
          mentor_name: string
          assignment_id: string
          student_id: string
          student_name: string
          overall_summary: string
          student_comment: string
          needs_attention: boolean
          attention_remark: string | null
          is_submitted: boolean
        }>
      }
      save_public_meeting_report: {
        Args: {
          p_report_token: string
          p_overall_summary: string
          p_student_reports: Array<{
            assignment_id: string
            student_comment: string
            needs_attention: boolean
            attention_remark: string | null
          }>
          p_submit?: boolean
        }
        Returns: undefined
      }
      clear_all_tasks: {
        Args: Record<string, never>
        Returns: number
      }
      clear_all_announcements: {
        Args: Record<string, never>
        Returns: number
      }
    }
    Enums: {
      user_role: UserRole
      task_priority: TaskPriority
      submission_status: SubmissionStatus
      mentor_note_category: MentorNoteCategory
      attention_severity: AttentionSeverity
      attention_status: AttentionStatus
    }
  }
}
