import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type Message = Database['public']['Tables']['messages']['Row']
type Group = Database['public']['Tables']['mentor_groups']['Row']

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

export async function deleteMessage(messageId: string) {
  const { error } = await supabase.from('messages').delete().eq('id', messageId)
  if (error) throw error
}

/**
 * Subscribe to new messages matching one mentor-mentee pair.
 */
export function subscribeToMessages(
  filter: { userA: string; userB: string } | { groupId: string },
  onInsert: (message: Message) => void,
  onDelete?: (messageId: string) => void,
) {
  const channelName = 'groupId' in filter
    ? `messages:group:${filter.groupId}`
    : `messages:personal:${[filter.userA, filter.userB].sort().join(':')}`

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
        // Postgres changes filters cannot express the pair in both directions,
        // so filter client-side to just this conversation.
        const { userA, userB } = filter
        const isThisThread =
          (row.sender_id === userA && row.receiver_id === userB) ||
          (row.sender_id === userB && row.receiver_id === userA)
        if (isThisThread) onInsert(row)
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'messages',
        filter: 'groupId' in filter ? `group_id=eq.${filter.groupId}` : undefined,
      },
      (payload) => {
        if (!onDelete) return
        const row = payload.old as Partial<Message>
        if ('groupId' in filter) {
          onDelete(row.id as string)
          return
        }
        const { userA, userB } = filter
        const isThisThread =
          (row.sender_id === userA && row.receiver_id === userB) ||
          (row.sender_id === userB && row.receiver_id === userA)
        if (isThisThread) onDelete(row.id as string)
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
