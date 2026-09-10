import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type Message = Database['public']['Tables']['messages']['Row']

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

export async function sendMessage(params: {
  senderId: string
  receiverId?: string
  message: string
  attachment?: string | null
}): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: params.senderId,
      receiver_id: params.receiverId ?? null,
      group_id: null,
      message: params.message,
      attachment: params.attachment ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Subscribe to new messages matching one mentor-mentee pair.
 */
export function subscribeToMessages(
  filter: { userA: string; userB: string },
  onInsert: (message: Message) => void,
) {
  const channelName = `messages:personal:${[filter.userA, filter.userB].sort().join(':')}`

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: undefined,
      },
      (payload) => {
        const row = payload.new as Message
        // Postgres changes filters cannot express the pair in both directions,
        // so filter client-side to just this conversation.
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
