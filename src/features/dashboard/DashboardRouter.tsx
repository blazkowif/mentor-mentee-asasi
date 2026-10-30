import { useAuthStore } from '@/features/auth/authStore'
import StudentDashboard from './StudentDashboard'
import LecturerDashboard from './LecturerDashboard'
import AdminControlPage from '@/features/admin/AdminControlPage'

export default function DashboardRouter() {
  const role = useAuthStore((s) => s.role)

  if (role === 'admin') return <AdminControlPage />
  if (role === 'lecturer') return <LecturerDashboard />
  return <StudentDashboard />
}
