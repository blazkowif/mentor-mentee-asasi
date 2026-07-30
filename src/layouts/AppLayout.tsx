import { Outlet } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/authStore'
import ProfileSidebar from './ProfileSidebar'

export default function AppLayout() {
  const { user, role } = useAuthStore()

  return (
    <div className="min-h-screen bg-ums-gray-light">
      <header className="flex items-center justify-between bg-ums-blue px-6 py-3 text-white">
        <span className="font-semibold">PPST Mentor-Mentee System</span>
        <span className="text-sm opacity-90">
          {user?.name} · {role}
        </span>
      </header>
      <div className="flex">
        <ProfileSidebar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
