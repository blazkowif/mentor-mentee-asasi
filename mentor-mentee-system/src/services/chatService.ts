import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type Message = Database['public']['Tables']['messages']['Row']
type Group = Database['public']['Tables']['mentor_groups']['Row']

// A lecturer's group id is their own mentor_groups row; a student's is their
// mentor's mentor_groups row. Look it up once and reuse for chat + storage paths.
export async function getMyGroup(lecturerOrMentorId: string): Promise<Group | null> {
  const { data, error } = await supabase
    .from('mentor_groups')
    .select('*')
    .eq('lecturer_id', lecturerOrMentorId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function listPersonalMessages(userA: string, userB: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(
      `and(sender_id.eq.${userA},receiver_id.eq.${userB}),and(sender_id.eq.${userB},receiver_id.eq.${userA})`,
    )
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function listGroupMessages(groupId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function sendMessage(params: {
  senderId: string
  receiverId?: string
  groupId?: string
  message: string
  attachment?: string | null
}): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: params.senderId,
      receiver_id: params.receiverId ?? null,
      group_id: params.groupId ?? null,
      message: params.message,
      attachment: params.attachment ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Subscribe to new messages matching a personal thread or a group, via
 * Supabase Realtime (Postgres changes). Returns an unsubscribe function.
 */
export function subscribeToMessages(
  filter: { groupId: string } | { userA: string; userB: string },
  onInsert: (message: Message) => void,
) {
  const channelName =
    'groupId' in filter ? `messages:group:${filter.groupId}` : `messages:personal:${[filter.userA, filter.userB].sort().join(':')}`

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: 'groupId' in filter ? `group_id=eq.${filter.groupId}` : undefined,
      },
      (payload) => {
        const row = payload.new as Message
        if ('groupId' in filter) {
          onInsert(row)
          return
        }
        // Personal chat: Postgres changes filters can't express OR, so filter
        // client-side to just this pair.
        const { userA, userB } = filter
        const isThisThread =
          (row.sender_id === userA && row.receiver_id === userB) ||
          (row.sender_id === userB && row.receiver_id === userA)
        if (isThisThread) onInsert(row)
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
