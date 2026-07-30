import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/authStore'
import { uploadFile, getPublicUrl } from '@/services/storageService'
import * as userService from '@/services/userService'
import { queryKeys } from '@/lib/queryKeys'

export default function ProfileSidebar() {
  const user = useAuthStore((s) => s.user)
  const setId = useAuthStore((s) => s.setUser)
  const location = useLocation()
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
    const path = `${user.id}/${file.name}`
    await uploadFile('profile', path, file)
    const url = getPublicUrl('profile', path)
    await userService.updateProfile(user.id, { profile_image: url })
    const updated = await userService.getProfile(user.id)
    setId(updated)
  }

  return (
    <aside className="hidden w-72 shrink-0 lg:block">
      <div className="sticky top-6 space-y-4">
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
            <label className="mt-2 cursor-pointer text-xs text-ums-blue hover:underline">
              {user.profile_image ? 'Change photo' : 'Upload photo'}
              <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleAvatar} />
            </label>
          </div>

          <div className="mt-4 space-y-2">
            <div>
              <p className="text-xs text-gray-400">Name</p>
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Email</p>
              <p className="text-sm text-gray-900">{user.email || '—'}</p>
            </div>
            {user.matric_number && (
              <div>
                <p className="text-xs text-gray-400">Matric Number</p>
                <p className="text-sm text-gray-900">{user.matric_number}</p>
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
            <NavItem to="/dashboard" label="Dashboard" />
            <NavItem to="/chat" label="Chat" />
            <NavItem to="/tasks" label="Tasks" />
            <NavItem to="/announcements" label="Announcements" />
            <NavItem to="/notifications" label="Notifications" />
            <NavItem to="/profile" label="Profile" />
            {user.role === 'admin' && (
              <>
                <NavItem to="/admin/dashboard" label="Admin Dashboard" />
                <NavItem to="/admin/assignment" label="Assignment" />
                <NavItem to="/admin/search" label="Search" />
              </>
            )}
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
