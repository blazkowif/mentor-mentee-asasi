import { useAuthStore } from '@/features/auth/authStore'
import StudentDashboard from './StudentDashboard'
import LecturerDashboard from './LecturerDashboard'
import AdminDashboard from './AdminDashboard'

export default function DashboardRouter() {
  const role = useAuthStore((s) => s.role)

  if (role === 'admin') return <AdminDashboard />
  if (role === 'lecturer') return <LecturerDashboard />
  return <StudentDashboard />
}
