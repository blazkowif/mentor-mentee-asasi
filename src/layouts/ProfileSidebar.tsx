import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/authStore'
import { uploadFile, getPublicUrl } from '@/services/storageService'
import * as userService from '@/services/userService'
import { queryKeys } from '@/lib/queryKeys'
import LoadingButton from '@/components/LoadingButton'

export default function ProfileSidebar() {
  const user = useAuthStore((s) => s.user)
  const setId = useAuthStore((s) => s.setUser)
  const location = useLocation()
  const [isUploading, setIsUploading] = useState(false)
  const isHidden = location.pathname.startsWith('/admin/assignment')

  const { data: mentor } = useQuery({
    queryKey: queryKeys.users.mentor(user?.id ?? ''),
    queryFn: () => (user?.mentor_id ? userService.getMentor(user.mentor_id) : Promise.resolve(null)),
    enabled: !!user?.mentor_id,
  })

  if (!user || isHidden) return null

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setIsUploading(true)
    try {
      const path = `${user.id}/${file.name}`
      await uploadFile('profile', path, file)
      const url = getPublicUrl('profile', path)
      await userService.updateProfile(user.id, { profile_image: url })
      const updated = await userService.getProfile(user.id)
      setId(updated)
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  return (
    <aside className="hidden h-[calc(100vh-57px)] w-72 shrink-0 overflow-y-auto lg:block">
      <div className="space-y-4 p-1">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex flex-col items-center">
            <div className="h-24 w-24 overflow-hidden rounded-full bg-ums-gray">
              {user.profile_image ? (
                <img src={user.profile_image} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-3xl font-semibold text-gray-400">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <LoadingButton type="button" loading={isUploading} loadingLabel="Uploading…" className="mt-2 text-xs text-ums-blue hover:underline" onClick={() => document.getElementById('sidebar-avatar-upload')?.click()}>
              {user.profile_image ? 'Change photo' : 'Upload photo'}
            </LoadingButton>
            <input id="sidebar-avatar-upload" type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleAvatar} disabled={isUploading} />
          </div>

          <div className="mt-4 space-y-2">
            <div>
              <p className="text-xs text-gray-400">Name</p>
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
            </div>
            {user.role === 'student' ? (
              user.matric_number && (
                <div>
                  <p className="text-xs text-gray-400">Matric Number</p>
                  <p className="text-sm text-gray-900">{user.matric_number}</p>
                </div>
              )
            ) : (
              <div>
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-sm text-gray-900">{user.email || '—'}</p>
              </div>
            )}
            {user.programme && (
              <div>
                <p className="text-xs text-gray-400">Course</p>
                <p className="text-sm text-gray-900">{user.programme}</p>
              </div>
            )}
            {user.role === 'student' && (
              <div>
                <p className="text-xs text-gray-400">Mentor</p>
                <p className="text-sm text-gray-900">{mentor?.name || '—'}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400">Address</p>
              <p className="text-sm text-gray-900">{user.address || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Motto</p>
              <p className="text-sm text-gray-900">{user.motto || '—'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-2 shadow-sm">
          <nav className="space-y-1">
            <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Main menu</p>
            <NavItem to={user.role === 'admin' ? '/admin/control' : '/dashboard'} label={user.role === 'admin' ? 'Admin Dashboard' : 'Dashboard'} />
            <NavItem to="/chat" label="Chat" />
            <NavItem to="/tasks" label="Tasks" />
            <NavItem to="/announcements" label="Announcements" />
            <NavItem to="/notifications" label="Notifications" />
            <NavItem to="/profile" label="Profile" />
          </nav>
        </div>
      </div>
    </aside>
  )
}

function NavItem({ to, label }: { to: string; label: string }) {
  const active = useLocation().pathname === to || useLocation().pathname.startsWith(to + '/')
  return (
    <Link
      to={to}
      className={`block rounded px-3 py-2 text-sm ${active ? 'bg-ums-blue text-white' : 'text-gray-700 hover:bg-gray-50'}`}
    >
      {label}
    </Link>
  )
}
