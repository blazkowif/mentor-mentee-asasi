import { useState } from 'react'
import { useAuthStore } from '@/features/auth/authStore'
import {
  useLecturerAnnouncements,
  useMentorAnnouncements,
  useCreateAnnouncement,
  useDeleteAnnouncement,
} from './hooks/useAnnouncements'
import AnnouncementForm from './components/AnnouncementForm'
import AnnouncementCard from './components/AnnouncementCard'

// Announcement feed, lecturer-post form (PRD §12).
export default function AnnouncementsPage() {
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const [showForm, setShowForm] = useState(false)

  if (!user) return null

  if (role === 'lecturer') {
    const { data: announcements, isLoading } = useLecturerAnnouncements(user.id)
    const createAnnouncement = useCreateAnnouncement(user.id)
    const deleteAnnouncement = useDeleteAnnouncement(user.id)

    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Announcements</h1>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="rounded bg-ums-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-ums-blue-light"
            >
              + New announcement
            </button>
          )}
        </div>

        {showForm && (
          <AnnouncementForm
            isSubmitting={createAnnouncement.isPending}
            onCancel={() => setShowForm(false)}
            onSubmit={(values) =>
              createAnnouncement.mutate(values, { onSuccess: () => setShowForm(false) })
            }
          />
        )}

        {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
        <div className="space-y-3">
          {announcements?.map((a) => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              onDelete={() => deleteAnnouncement.mutate(a.id)}
            />
          ))}
          {announcements?.length === 0 && (
            <p className="text-sm text-gray-500">No announcements posted yet.</p>
          )}
        </div>
      </div>
    )
  }

  const { data: announcements, isLoading } = useMentorAnnouncements(user.mentor_id)

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-gray-900">Announcements</h1>
      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      <div className="space-y-3">
        {announcements?.map((a) => (
          <AnnouncementCard key={a.id} announcement={a} />
        ))}
        {announcements?.length === 0 && (
          <p className="text-sm text-gray-500">No announcements yet.</p>
        )}
      </div>
    </div>
  )
}
