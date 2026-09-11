// Hand-authored to match supabase/migrations/0001_init.sql, in the shape
// @supabase/supabase-js expects (Tables need Relationships; the schema needs
// Views/Functions even when empty). Once the project is linked, replace with
// the generated types:
//   npx supabase gen types typescript --project-id <ref> > src/types/database.types.ts

export type UserRole = 'student' | 'lecturer' | 'admin'
export type TaskPriority = 'low' | 'medium' | 'high'
export type SubmissionStatus = 'pending' | 'submitted' | 'reviewed' | 'completed'

export interface Database {
  public: {
    Tables: {
      users: {
  Row: {
    id: string
    role: UserRole
    matric_number: string | null
    ic_number?: string | null
    name: string
    programme: string | null
    mentor_id: string | null
    email: string | null
    phone: string | null
    profile_image: string | null
    address: string | null
    motto: string | null
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
          title: string
          content: string | null
          attachment: string | null
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
          programme: string | null
          profile_image: string | null
        }>
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
    }
    Enums: {
      user_role: UserRole
      task_priority: TaskPriority
      submission_status: SubmissionStatus
    }
  }
}
