import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/authStore'
import type { Database } from '@/types/database.types'
import { queryKeys } from '@/lib/queryKeys'
import {
  useMentees,
  useMentor,
  useMyGroups,
  useStudentSearch,
  usePinnedChatContacts,
  useChatContacts,
  useMarkChatRead,
  usePersonalMessages,
  useGroupMessages,
  useSendMessage,
  useDeleteMessage,
} from './hooks/useChat'
import * as chatService from '@/services/chatService'
import ConversationList, { type ChatThread } from './components/ConversationList'
import MessageBubble from './components/MessageBubble'
import MessageInput from './components/MessageInput'
import * as userService from '@/services/userService'
import * as mentorNotesService from '@/services/mentorNotesService'

type Message = Database['public']['Tables']['messages']['Row']

export default function ChatPage() {
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const [studentSearch, setStudentSearch] = useState('')
  const [showAllGroupMembers, setShowAllGroupMembers] = useState(false)
  const [pendingMessages, setPendingMessages] = useState<Message[]>([])
  const [sendError, setSendError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const isLecturer = role === 'lecturer'
  const isAdmin = role === 'admin'
  const { data: mentees } = useMentees(isLecturer ? user?.id : undefined)
  const { data: mentor } = useMentor(!isLecturer ? user?.mentor_id : undefined)
  const { data: groups = [] } = useMyGroups(user?.id)
  const { data: studentResults = [] } = useStudentSearch(studentSearch, role === 'student' || isAdmin || isLecturer)
  const pinnedContactsQuery = usePinnedChatContacts(user?.id, !isAdmin)
  const { data: pinnedContacts = [] } = pinnedContactsQuery
  const { data: chatContacts = [] } = useChatContacts(user?.id)
  const currentGroupId = groups.find((chatGroup) => chatGroup.is_current)?.id
  const currentGroupMembersQuery = useQuery({
    queryKey: ['chat', 'current-group-members', currentGroupId ?? ''],
    queryFn: () => chatService.listGroupMembers(currentGroupId!),
    enabled: !!currentGroupId && role === 'student',
  })
  const markChatRead = useMarkChatRead()
  const sendMessage = useSendMessage()
  const deleteMessage = useDeleteMessage()
  const [clearingHistory, setClearingHistory] = useState(false)
  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const [profileNote, setProfileNote] = useState('')
  const [profileNoteMessage, setProfileNoteMessage] = useState('')
  const [mentorNote, setMentorNote] = useState('')
  const [mentorNoteMessage, setMentorNoteMessage] = useState('')
  const profileQuery = useQuery({ queryKey: ['chat-profile', profileUserId ?? ''], queryFn: () => userService.getChatProfile(profileUserId!), enabled: !!profileUserId })
  const adminNotesQuery = useQuery({
    queryKey: ['internal-notes', profileUserId ?? ''],
    queryFn: () => mentorNotesService.listInternalNotes(profileUserId!),
    enabled: isAdmin && !!profileUserId,
  })
  const mentorNotesQuery = useQuery({
    queryKey: ['mentor-notes', 'profile', profileUserId ?? ''],
    queryFn: () => mentorNotesService.listMentorNotes(profileUserId!),
    enabled: (isAdmin || isLecturer) && !!profileUserId,
  })

  const threads: ChatThread[] = useMemo(() => {
    const list: ChatThread[] = []
    const addThread = (thread: ChatThread) => {
      if (!list.some((existing) => existing.key === thread.key)) list.push(thread)
    }
    if (role === 'student') {
      const designatedAdmin = pinnedContacts.find(
        (contact) => contact.contact_type === 'admin' && contact.email?.toLowerCase() === 'stevesalag@ums.edu.my',
      )
      const fallbackAdmin = pinnedContacts.find((contact) => contact.contact_type === 'admin')
      const adminContact = designatedAdmin ?? fallbackAdmin
      if (adminContact) {
        addThread({
          key: `personal:${adminContact.id}`,
          label: adminContact.name,
          subtitle: adminContact.email ?? 'Administrator',
          unreadCount: chatContacts.find((contact) => contact.id === adminContact.id)?.unread_count ?? 0,
        })
      }
      const currentGroup = groups.find((chatGroup) => chatGroup.is_current)
      if (currentGroup) {
        addThread({ key: `group:${currentGroup.id}`, label: currentGroup.group_name, subtitle: 'Group mentor' })
      }
      if (mentor) {
        addThread({ key: `personal:${mentor.id}`, label: mentor.name, subtitle: 'Your mentor' })
      }
      currentGroupMembersQuery.data?.forEach((member) => {
        if (member.id !== user?.id) {
          addThread({ key: `personal:${member.id}`, label: member.name, subtitle: member.matric_number ?? 'Group mentee' })
        }
      })
      return list
    }
    pinnedContacts.forEach((contact) =>
      addThread({
        key: `personal:${contact.id}`,
        label: contact.name,
        subtitle: contact.contact_type === 'mentor' ? 'Your mentor' : 'Administrator',
        unreadCount: chatContacts.find((chatContact) => chatContact.id === contact.id)?.unread_count ?? 0,
      }),
    )
    chatContacts.forEach((contact) => {
      addThread({
        key: `personal:${contact.id}`,
        label: contact.name,
        subtitle: contact.role === 'admin'
          ? 'Administrator'
          : contact.role === 'lecturer'
          ? 'Mentor'
          : contact.matric_number ?? 'Student',
        unreadCount: contact.unread_count,
      })
    })
    const currentGroups = groups.filter((chatGroup) => chatGroup.is_current)
    const previousGroups = groups.filter((chatGroup) => !chatGroup.is_current)
    currentGroups.forEach((chatGroup) =>
      addThread({
        key: `group:${chatGroup.id}`,
        label: chatGroup.group_name,
        subtitle: chatGroup.is_current ? 'Current mentor group' : 'Previous mentor group',
      }),
    )
    if (!isLecturer && mentor && !pinnedContacts.some((contact) => contact.id === mentor.id)) {
      addThread({ key: `personal:${mentor.id}`, label: mentor.name, subtitle: 'Your mentor' })
    }
    previousGroups.forEach((chatGroup) =>
      addThread({
        key: `group:${chatGroup.id}`,
        label: chatGroup.group_name,
        subtitle: 'Previous mentor group',
      }),
    )
    if (isLecturer) {
      mentees?.forEach((m) => addThread({ key: `personal:${m.id}`, label: m.name, subtitle: m.matric_number ?? undefined }))
    }
    if (role === 'student' || isAdmin || isLecturer) {
      studentResults.forEach((student) =>
        addThread({ key: `personal:${student.id}`, label: student.name, subtitle: student.matric_number ?? 'Student' }),
      )
    }
    if (role === 'student') {
      currentGroupMembersQuery.data?.forEach((member) => {
        if (member.id === user?.id) return
        addThread({ key: `personal:${member.id}`, label: member.name, subtitle: member.matric_number ?? 'Group mentee' })
      })
    }
    return list
  }, [chatContacts, currentGroupMembersQuery.data, groups, isAdmin, isLecturer, mentees, mentor, pinnedContacts, role, studentResults, user?.id])

  function selectThread(key: string) {
    setActiveKey(key)
    if (key.startsWith('personal:')) {
      markChatRead.mutate(key.slice('personal:'.length))
    }
  }

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
  useEffect(() => {
    setShowAllGroupMembers(false)
  }, [activeGroupId])

  const groupMembersQuery = useQuery({
    queryKey: ['chat', 'group-members', activeGroupId ?? ''],
    queryFn: () => chatService.listGroupMembers(activeGroupId!),
    enabled: !!activeGroupId,
  })
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

  async function saveProfileNote() {
    if (!user || !profileUserId || !profileNote.trim()) return
    try {
      await mentorNotesService.createInternalNote(profileUserId, user.id, profileNote.trim())
      setProfileNote('')
      setProfileNoteMessage('Note saved.')
      await queryClient.invalidateQueries({ queryKey: ['internal-notes', profileUserId] })
    } catch (error) {
      setProfileNoteMessage(error instanceof Error ? error.message : 'Unable to save note.')
    }
  }

  async function saveMentorNote() {
    if (!user || !profileUserId || !mentorNote.trim() || !isLecturer) return
    try {
      await mentorNotesService.createMentorNote({
        student_id: profileUserId,
        mentor_id: user.id,
        category: 'general',
        note: mentorNote.trim(),
      })
      setMentorNote('')
      setMentorNoteMessage('Sticky note saved.')
      await queryClient.invalidateQueries({ queryKey: ['mentor-notes', 'profile', profileUserId] })
      await queryClient.invalidateQueries({ queryKey: queryKeys.mentorNotes.byMentor(user.id) })
    } catch (error) {
      setMentorNoteMessage(error instanceof Error ? error.message : 'Unable to save mentor note.')
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
          {(role === 'student' || isAdmin || isLecturer) && (
            <input
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
              placeholder="Find a person..."
              className="mt-3 w-full rounded-lg border border-[#4b5375] bg-[#171b2b] px-3 py-2 text-xs text-white outline-none placeholder:text-[#9ca5c5] focus:border-[#8994ed]"
            />
          )}
          {pinnedContactsQuery.isError && (
            <p className="mt-2 text-xs text-red-200">
              Admin contact unavailable. Apply the latest Supabase migration.
            </p>
          )}
        </div>
        <ConversationList threads={threads} activeKey={effectiveActiveKey} onSelect={selectThread} />
      </aside>

      <div className="flex flex-1 flex-col bg-[#171b2b]">
        {activeThread ? (
          <>
            <div className="border-b border-[#3a405c] bg-[#252a40] px-5 py-4">
              <button type="button" onClick={() => otherUserId && setProfileUserId(otherUserId)} className="font-semibold text-white hover:underline">
                {activeThread.label}
              </button>
              <span className="ml-2 text-xs text-[#8f95b5]">{activeThread.subtitle}</span>
            </div>
            {activeGroupId && (
              <div className="border-b border-[#3a405c] bg-[#20243a] px-5 py-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#aeb6d2]">Group members</p>
                  {(groupMembersQuery.data?.length ?? 0) > 5 && (
                    <button
                      type="button"
                      onClick={() => setShowAllGroupMembers((visible) => !visible)}
                      className="text-xs font-medium text-[#c5cbff] hover:underline"
                    >
                      {showAllGroupMembers ? 'Show less' : `View all (${groupMembersQuery.data?.length ?? 0})`}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(showAllGroupMembers ? groupMembersQuery.data : groupMembersQuery.data?.slice(0, 5))?.map((member) => (
                    <button key={member.id} type="button" onClick={() => selectThread(`personal:${member.id}`)} className="rounded-full bg-[#303650] px-3 py-1 text-xs text-white hover:bg-[#46507a]">
                      {member.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
              ? 'Select a contact or mentee to start chatting.'
              : role === 'student'
              ? 'Your mentor chat will appear here once assigned.'
              : 'Chat is available only for mentor-mentee conversations.'}
          </div>
        )}
      </div>
      {profileUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setProfileUserId(null)}>
          <section className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            {profileQuery.isLoading && <p className="text-sm text-gray-500">Loading profile…</p>}
            {profileQuery.isError && (
              <div>
                <p className="text-sm text-red-600">Unable to load this profile.</p>
                <p className="mt-1 text-xs text-gray-500">{profileQuery.error instanceof Error ? profileQuery.error.message : 'Please try again.'}</p>
              </div>
            )}
            {profileQuery.data && <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{profileQuery.data.name}</h2>
                  <p className="text-sm capitalize text-gray-500">
                    {profileQuery.data.role === 'lecturer' ? 'Mentor profile' : profileQuery.data.role}
                  </p>
                </div>
                <button type="button" onClick={() => setProfileUserId(null)} className="text-xl text-gray-400" aria-label="Close profile">×</button>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div><dt className="text-xs text-gray-400">Matric / staff ID</dt><dd>{profileQuery.data.matric_number || '—'}</dd></div>
                <div><dt className="text-xs text-gray-400">Programme</dt><dd>{profileQuery.data.programme || '—'}</dd></div>
                <div>
                  <dt className="text-xs text-gray-400">Email</dt>
                  <dd>
                    {profileQuery.data.email ? (
                      <a href={`mailto:${profileQuery.data.email}`} className="text-ums-blue hover:underline">{profileQuery.data.email}</a>
                    ) : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Phone</dt>
                  <dd>
                    {profileQuery.data.phone ? (
                      <a href={`tel:${profileQuery.data.phone}`} className="text-ums-blue hover:underline">{profileQuery.data.phone}</a>
                    ) : '—'}
                  </dd>
                </div>
                <div><dt className="text-xs text-gray-400">Address</dt><dd className="whitespace-pre-wrap">{profileQuery.data.address || '—'}</dd></div>
                <div><dt className="text-xs text-gray-400">Motto</dt><dd className="italic text-gray-700">{profileQuery.data.motto || '—'}</dd></div>
              </dl>
              {(isAdmin || isLecturer) && profileQuery.data.role === 'student' && (
                <div className="mt-5 border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700">Mentor sticky notes</h3>
                  {mentorNotesQuery.data?.length ? (
                    <div className="mt-2 space-y-2">
                      {mentorNotesQuery.data.map((entry) => (
                        <div key={entry.id} className="rounded border border-amber-200 bg-amber-50 p-3 shadow-sm">
                          <p className="whitespace-pre-wrap text-sm text-gray-700">{entry.note}</p>
                          <p className="mt-1 text-xs text-gray-500">{entry.category.replace('_', ' ')} · {new Date(entry.created_at).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-gray-500">No mentor notes for this student yet.</p>
                  )}
                  {isLecturer && (
                    <div className="mt-3">
                      <textarea value={mentorNote} onChange={(event) => setMentorNote(event.target.value)} rows={3} className="w-full rounded border px-3 py-2 text-sm" placeholder="Add a sticky note about this student..." />
                      <button type="button" onClick={saveMentorNote} disabled={!mentorNote.trim()} className="mt-2 rounded bg-amber-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Add sticky note</button>
                      {mentorNoteMessage && <p className="mt-2 text-xs text-gray-600">{mentorNoteMessage}</p>}
                    </div>
                  )}
                </div>
              )}
            {isAdmin && profileQuery.data.role === 'student' && (
              <div className="mt-5 border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-700">Admin note</h3>
                <p className="mt-1 text-xs text-gray-500">Visible to administrators and the assigned mentor.</p>
                <textarea value={profileNote} onChange={(event) => setProfileNote(event.target.value)} rows={3} className="mt-2 w-full rounded border px-3 py-2 text-sm" placeholder="Leave a note about this student..." />
                <button type="button" onClick={saveProfileNote} disabled={!profileNote.trim()} className="mt-2 rounded bg-ums-blue px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Save note</button>
                {profileNoteMessage && <p className="mt-2 text-xs text-gray-600">{profileNoteMessage}</p>}
                <div className="mt-3 space-y-2">
                  {adminNotesQuery.data?.slice(0, 3).map((entry) => (
                    <p key={entry.id} className="rounded bg-gray-50 p-2 text-xs text-gray-700">{entry.note}</p>
                  ))}
                </div>
              </div>
            )}
            </>}
          </section>
        </div>
      )}
    </div>
  )
}
