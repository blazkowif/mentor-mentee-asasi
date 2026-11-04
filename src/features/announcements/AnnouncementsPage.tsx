import { useEffect, useState } from 'react'
import { useAuthStore } from '@/features/auth/authStore'
import { useMentees, useMentor } from '@/features/chat/hooks/useChat'
import {
  useMentorAnnouncements,
} from './hooks/useAnnouncements'
import { useQuery } from '@tanstack/react-query'
import * as announcementService from '@/services/announcementService'
import * as adminService from '@/services/adminService'
import { uploadFile, getPublicUrl } from '@/services/storageService'
import type { Database } from '@/types/database.types'
import * as notificationService from '@/services/notificationService'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'

type Announcement = Database['public']['Tables']['announcements']['Row']
import AnnouncementForm from './components/AnnouncementForm'
import AnnouncementCard from './components/AnnouncementCard'

// Announcement feed, lecturer-post form (PRD §12).
export default function AnnouncementsPage() {
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!user) return
    notificationService.markTitlesAsRead(user.id, ['New announcement'])
      .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.byUser(user.id) }))
      .catch(() => undefined)
  }, [queryClient, user])
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState('')
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [saving, setSaving] = useState(false)
  const { data: mentees = [] } = useMentees(role === 'lecturer' ? user?.id : undefined)
  const { data: studentMentor } = useMentor(role === 'student' ? user?.mentor_id : undefined)
  const adminUsersQuery = useQuery({
    queryKey: ['announcement-authors'],
    queryFn: adminService.listAllUsers,
    enabled: role === 'admin',
  })
  const studentAnnouncements = useQuery({
    queryKey: ['announcements', 'student', user?.id ?? ''],
    queryFn: () => announcementService.listAnnouncementsForStudent(user!.id, user!.mentor_id),
    enabled: !!user && role === 'student',
  })

  if (!user) return null

  if (role === 'lecturer' || role === 'admin') {
    const userId = user.id
    const announcementsQuery = useQuery({
      queryKey: ['announcements', role === 'admin' ? 'all' : 'lecturer', userId],
      queryFn: () => role === 'admin'
        ? announcementService.listAllAnnouncements()
        : announcementService.listAnnouncementsByLecturer(userId),
    })
    const announcements = announcementsQuery.data
    const isLoading = announcementsQuery.isLoading

    async function saveAnnouncement(values: { title: string; content: string; audience: 'group' | 'all' | 'staff' | 'global'; attachment: File | null }) {
      if (!window.confirm(editingAnnouncement ? 'Are you sure you want to save these announcement changes?' : 'Are you sure you want to post this announcement?')) return
      setSaving(true)
      setFormError('')
      try {
        let attachment = editingAnnouncement?.attachment ?? null
        if (values.attachment) {
          const path = `${userId}/${crypto.randomUUID()}-${values.attachment.name}`
          await uploadFile('announcements', path, values.attachment)
          attachment = getPublicUrl('announcements', path)
        }
        const patch = {
          title: values.title.trim(),
          content: values.content.trim() || null,
          attachment,
          is_global: role === 'admin' ? values.audience === 'global' : values.audience === 'all',
          target_role: role === 'admin' && values.audience === 'staff' ? 'lecturer' : role === 'admin' && values.audience === 'group' ? 'student' : null,
        } as const
        if (editingAnnouncement) {
          await announcementService.updateAnnouncement(editingAnnouncement.id, patch)
        } else {
          await announcementService.createAnnouncement({ ...patch, lecturer_id: userId })
        }
        await announcementsQuery.refetch()
        setEditingAnnouncement(null)
        setShowForm(false)
      } catch (error) {
        setFormError(error instanceof Error ? error.message : 'Unable to save announcement.')
      } finally {
        setSaving(false)
      }
    }

    function deleteAnnouncement(id: string) {
      if (!window.confirm('Are you sure you want to delete this announcement?')) return
      announcementService.deleteAnnouncement(id).then(() => announcementsQuery.refetch()).catch((error) => setFormError(error instanceof Error ? error.message : 'Unable to delete announcement.'))
    }

    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">Announcements</h1>
            <p className="text-sm text-gray-500">Share important updates with your students and staff.</p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="rounded bg-ums-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-ums-blue-light"
            >
              + Add announcement
            </button>
          )}
        </div>

        {(showForm || editingAnnouncement) && (
          <AnnouncementForm
            isSubmitting={saving}
            onCancel={() => { setShowForm(false); setEditingAnnouncement(null) }}
            onSubmit={saveAnnouncement}
            initialValues={editingAnnouncement ? {
              title: editingAnnouncement.title,
              content: editingAnnouncement.content ?? '',
              attachment: editingAnnouncement.attachment,
              audience: editingAnnouncement.is_global
                ? (role === 'admin' ? 'global' : 'all')
                : editingAnnouncement.target_role === 'lecturer'
                ? 'staff'
                : 'group',
            } : undefined}
            audienceOptions={role === 'admin'
              ? [
                  { value: 'global', label: 'Everyone' },
                  { value: 'group', label: 'All students' },
                  { value: 'staff', label: 'Mentors / teachers' },
                ]
              : [
                  { value: 'group', label: 'My mentor group' },
                  { value: 'all', label: 'All students' },
                ]}
          />
        )}
        {formError && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

        {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
        <div className="space-y-3">
          {announcements?.map((a) => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              authorName={a.lecturer_id === user.id
                ? user.name
                : role === 'admin'
                ? adminUsersQuery.data?.find((author) => author.id === a.lecturer_id)?.name ?? 'Administrator'
                : mentees.find((mentee) => mentee.id === a.lecturer_id)?.name}
              onEdit={a.lecturer_id === user.id || role === 'admin' ? () => { setEditingAnnouncement(a); setShowForm(false) } : undefined}
              onDelete={a.lecturer_id === user.id || role === 'admin' ? () => deleteAnnouncement(a.id) : undefined}
            />
          ))}
          {announcements?.length === 0 && (
            <p className="text-sm text-gray-500">No announcements posted yet.</p>
          )}
        </div>
      </div>
    )
  }

  const { data: mentorAnnouncements, isLoading: mentorAnnouncementsLoading } = useMentorAnnouncements(user.mentor_id)
  const announcements = role === 'student' ? studentAnnouncements.data : mentorAnnouncements
  const isLoading = role === 'student' ? studentAnnouncements.isLoading : mentorAnnouncementsLoading

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-gray-900">Announcements</h1>
      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      <div className="space-y-3">
        {announcements?.map((a) => (
          <AnnouncementCard key={a.id} announcement={a} authorName={a.lecturer_id === studentMentor?.id ? studentMentor.name : 'Administrator'} />
        ))}
        {announcements?.length === 0 && (
          <p className="text-sm text-gray-500">No announcements yet.</p>
        )}
      </div>
    </div>
  )
}
