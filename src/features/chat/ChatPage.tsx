import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/authStore'
import type { Database } from '@/types/database.types'
import { queryKeys } from '@/lib/queryKeys'
import {
  useMentees,
  useMentor,
  useMyGroups,
  useStudentSearch,
  usePinnedChatContacts,
  usePersonalMessages,
  useGroupMessages,
  useSendMessage,
  useDeleteMessage,
} from './hooks/useChat'
import * as chatService from '@/services/chatService'
import ConversationList, { type ChatThread } from './components/ConversationList'
import MessageBubble from './components/MessageBubble'
import MessageInput from './components/MessageInput'

type Message = Database['public']['Tables']['messages']['Row']

export default function ChatPage() {
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const [studentSearch, setStudentSearch] = useState('')
  const [pendingMessages, setPendingMessages] = useState<Message[]>([])
  const [sendError, setSendError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const isLecturer = role === 'lecturer'
  const isAdmin = role === 'admin'
  const { data: mentees } = useMentees(isLecturer ? user?.id : undefined)
  const { data: mentor } = useMentor(!isLecturer ? user?.mentor_id : undefined)
  const { data: groups = [] } = useMyGroups(user?.id)
  const { data: studentResults = [] } = useStudentSearch(studentSearch, role === 'student' || isAdmin)
  const pinnedContactsQuery = usePinnedChatContacts(user?.id, !isAdmin)
  const { data: pinnedContacts = [] } = pinnedContactsQuery
  const sendMessage = useSendMessage()
  const deleteMessage = useDeleteMessage()
  const [clearingHistory, setClearingHistory] = useState(false)

  const threads: ChatThread[] = useMemo(() => {
    const list: ChatThread[] = []
    pinnedContacts.forEach((contact) =>
      list.push({
        key: `personal:${contact.id}`,
        label: contact.name,
        subtitle: contact.contact_type === 'mentor' ? 'Your mentor' : 'Administrator',
      }),
    )
    const currentGroups = groups.filter((chatGroup) => chatGroup.is_current)
    const previousGroups = groups.filter((chatGroup) => !chatGroup.is_current)
    currentGroups.forEach((chatGroup) =>
      list.push({
        key: `group:${chatGroup.id}`,
        label: chatGroup.group_name,
        subtitle: chatGroup.is_current ? 'Current mentor group' : 'Previous mentor group',
      }),
    )
    if (!isLecturer && mentor && !pinnedContacts.some((contact) => contact.id === mentor.id)) {
      list.push({ key: `personal:${mentor.id}`, label: mentor.name, subtitle: 'Your mentor' })
    }
    previousGroups.forEach((chatGroup) =>
      list.push({
        key: `group:${chatGroup.id}`,
        label: chatGroup.group_name,
        subtitle: 'Previous mentor group',
      }),
    )
    if (isLecturer) {
      mentees?.forEach((m) => list.push({ key: `personal:${m.id}`, label: m.name, subtitle: m.matric_number ?? undefined }))
    }
    if (role === 'student' || isAdmin) {
      studentResults.forEach((student) =>
        list.push({ key: `personal:${student.id}`, label: student.name, subtitle: student.matric_number ?? 'Student' }),
      )
    }
    return list
  }, [groups, isAdmin, isLecturer, mentees, mentor, pinnedContacts, role, studentResults])

  useEffect(() => {
    const requestedUserId = searchParams.get('user')
    if (requestedUserId && threads.some((thread) => thread.key === `personal:${requestedUserId}`)) {
      setActiveKey(`personal:${requestedUserId}`)
    }
  }, [searchParams, threads])

  const effectiveActiveKey = activeKey ?? threads[0]?.key ?? null
  const activeThread = threads.find((t) => t.key === effectiveActiveKey)

  const otherUserId =
    effectiveActiveKey?.startsWith('personal:') ? effectiveActiveKey.split(':')[1] : undefined

  const activeGroupId = effectiveActiveKey?.startsWith('group:') ? effectiveActiveKey.slice(6) : undefined
  const groupMessages = useGroupMessages(activeGroupId)
  const personalMessages = usePersonalMessages(
    effectiveActiveKey?.startsWith('personal:') ? user?.id : undefined,
    otherUserId,
  )

  const messages = activeGroupId ? groupMessages.data : personalMessages.data
  const visibleMessages = [...(messages ?? []), ...pendingMessages.filter((message) => {
    if (activeGroupId) return message.group_id === activeGroupId
    return message.receiver_id === otherUserId || message.sender_id === otherUserId
  })].filter((message, index, all) => all.findIndex((candidate) => candidate.id === message.id) === index)

  if (!user) return null

  function handleSend(text: string) {
    if (!user || !effectiveActiveKey) return
    setSendError(null)
    const temporaryId = `pending-${crypto.randomUUID()}`
    const pendingMessage: Message = {
      id: temporaryId,
      sender_id: user.id,
      receiver_id: activeGroupId ? null : otherUserId ?? null,
      group_id: activeGroupId ?? null,
      message: text,
      attachment: null,
      created_at: new Date().toISOString(),
    }
    setPendingMessages((current) => [...current, pendingMessage])

    const clearPending = () => {
      setPendingMessages((current) => current.filter((message) => message.id !== temporaryId))
    }

    if (activeGroupId) {
      sendMessage.mutate(
        { senderId: user.id, groupId: activeGroupId, message: text },
        {
          onSuccess: (message) => {
            clearPending()
            queryClient.setQueryData<Message[]>(queryKeys.chat.group(activeGroupId), (current) => [
              ...(current ?? []),
              message,
            ])
          },
          onError: (error) => {
            clearPending()
            setSendError(error instanceof Error ? error.message : 'Unable to send this message.')
          },
        },
      )
    } else if (otherUserId) {
      sendMessage.mutate(
        { senderId: user.id, receiverId: otherUserId, message: text },
        {
          onSuccess: (message) => {
            clearPending()
            queryClient.setQueryData<Message[]>(queryKeys.chat.personal(user.id, otherUserId), (current) => [
              ...(current ?? []),
              message,
            ])
          },
          onError: (error) => {
            clearPending()
            setSendError(error instanceof Error ? error.message : 'Unable to send this message.')
          },
        },
      )
    }
  }

  function handleDelete(messageId: string) {
    if (window.confirm('Delete this message for everyone in the conversation?')) {
      deleteMessage.mutate(messageId)
    }
  }

  async function handleClearHistory() {
    if (!window.confirm('Delete every personal and group chat message for all users? This cannot be undone.')) return
    setClearingHistory(true)
    try {
      await chatService.clearAllChatHistory()
      setPendingMessages([])
      await queryClient.invalidateQueries({ queryKey: ['chat'] })
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to clear chat history.')
    } finally {
      setClearingHistory(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-[#2b2d42] bg-[#11131f] shadow-xl">
      <aside className="flex w-64 shrink-0 flex-col border-r border-[#2b2d42] bg-[#191b2b]">
        <div className="border-b border-[#2b2d42] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#aeb4d4]">Messages</p>
          {isAdmin && (
            <button
              type="button"
              onClick={handleClearHistory}
              disabled={clearingHistory}
              className="mt-3 w-full rounded border border-red-400/60 px-3 py-2 text-xs font-medium text-red-200 hover:bg-red-500/20 disabled:opacity-50"
            >
              {clearingHistory ? 'Clearing history…' : 'Clear all chat history'}
            </button>
          )}
          {(role === 'student' || isAdmin) && (
            <input
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
              placeholder="Find a student..."
              className="mt-3 w-full rounded-lg border border-[#4b5375] bg-[#171b2b] px-3 py-2 text-xs text-white outline-none placeholder:text-[#9ca5c5] focus:border-[#8994ed]"
            />
          )}
          {pinnedContactsQuery.isError && (
            <p className="mt-2 text-xs text-red-200">
              Admin contact unavailable. Apply the latest Supabase migration.
            </p>
          )}
        </div>
        <ConversationList threads={threads} activeKey={effectiveActiveKey} onSelect={setActiveKey} />
      </aside>

      <div className="flex flex-1 flex-col bg-[#171b2b]">
        {activeThread ? (
          <>
            <div className="border-b border-[#3a405c] bg-[#252a40] px-5 py-4">
              <span className="font-semibold text-white">{activeThread.label}</span>
              <span className="ml-2 text-xs text-[#8f95b5]">{activeThread.subtitle}</span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto bg-[#171b2b] p-5">
              {visibleMessages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  isOwn={m.sender_id === user.id}
                  isSending={m.id.startsWith('pending-')}
                  onDelete={m.id.startsWith('pending-') || deleteMessage.isPending ? undefined : handleDelete}
                />
              ))}
              {visibleMessages.length === 0 && (
                <p className="text-center text-sm text-[#aeb6d2]">No messages yet. Say hello.</p>
              )}
            </div>
            {sendError && (
              <p className="border-t border-red-400/40 bg-red-950/40 px-5 py-2 text-xs text-red-200">
                Message was not sent: {sendError}
              </p>
            )}
            <MessageInput onSend={handleSend} disabled={sendMessage.isPending} />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
            {isAdmin
              ? 'Select a staff member or student to start chatting.'
              : isLecturer
              ? 'Select a mentee to start chatting.'
              : role === 'student'
              ? 'Your mentor chat will appear here once assigned.'
              : 'Chat is available only for mentor-mentee conversations.'}
          </div>
        )}
      </div>
    </div>
  )
}
