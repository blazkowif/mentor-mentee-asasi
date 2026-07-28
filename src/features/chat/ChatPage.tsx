import { useMemo, useState } from 'react'
import { useAuthStore } from '@/features/auth/authStore'
import {
  useMentees,
  useMentor,
  useMyGroup,
  usePersonalMessages,
  useGroupMessages,
  useSendMessage,
} from './hooks/useChat'
import ConversationList, { type ChatThread } from './components/ConversationList'
import MessageBubble from './components/MessageBubble'
import MessageInput from './components/MessageInput'

export default function ChatPage() {
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const [activeKey, setActiveKey] = useState<string | null>(null)

  const isLecturer = role === 'lecturer'
  const { data: mentees } = useMentees(isLecturer ? user?.id : undefined)
  const { data: mentor } = useMentor(!isLecturer ? user?.mentor_id : undefined)
  const { data: group } = useMyGroup(isLecturer ? user?.id : user?.mentor_id)
  const sendMessage = useSendMessage()

  const threads: ChatThread[] = useMemo(() => {
    const list: ChatThread[] = []
    if (group) list.push({ key: 'group', label: group.group_name, subtitle: 'Group chat' })
    if (isLecturer) {
      mentees?.forEach((m) => list.push({ key: `personal:${m.id}`, label: m.name, subtitle: m.matric_number ?? undefined }))
    } else if (mentor) {
      list.push({ key: `personal:${mentor.id}`, label: mentor.name, subtitle: 'Your mentor' })
    }
    return list
  }, [group, isLecturer, mentees, mentor])

  const effectiveActiveKey = activeKey ?? threads[0]?.key ?? null
  const activeThread = threads.find((t) => t.key === effectiveActiveKey)

  const otherUserId =
    effectiveActiveKey?.startsWith('personal:') ? effectiveActiveKey.split(':')[1] : undefined

  const groupMessages = useGroupMessages(effectiveActiveKey === 'group' ? group?.id : undefined)
  const personalMessages = usePersonalMessages(
    effectiveActiveKey?.startsWith('personal:') ? user?.id : undefined,
    otherUserId,
  )

  const messages = effectiveActiveKey === 'group' ? groupMessages.data : personalMessages.data

  if (!user) return null

  function handleSend(text: string) {
    if (!user || !effectiveActiveKey) return
    if (effectiveActiveKey === 'group' && group) {
      sendMessage.mutate({ senderId: user.id, groupId: group.id, message: text })
    } else if (otherUserId) {
      sendMessage.mutate({ senderId: user.id, receiverId: otherUserId, message: text })
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-lg bg-white shadow-sm">
      <ConversationList threads={threads} activeKey={effectiveActiveKey} onSelect={setActiveKey} />

      <div className="flex flex-1 flex-col">
        {activeThread ? (
          <>
            <div className="border-b border-gray-200 px-4 py-3">
              <span className="font-medium text-gray-900">{activeThread.label}</span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto bg-ums-gray-light p-4">
              {messages?.map((m) => (
                <MessageBubble key={m.id} message={m} isOwn={m.sender_id === user.id} />
              ))}
              {messages?.length === 0 && (
                <p className="text-center text-sm text-gray-400">No messages yet — say hello.</p>
              )}
            </div>
            <MessageInput onSend={handleSend} disabled={sendMessage.isPending} />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
            {isLecturer
              ? 'Select a mentee to start chatting.'
              : 'Your mentor / group chat will appear here once assigned.'}
          </div>
        )}
      </div>
    </div>
  )
}
