import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppLayout from '@/layouts/AppLayout'
import LoginPage from '@/features/auth/LoginPage'
import StaffLoginPage from '@/features/auth/StaffLoginPage'
import DashboardRouter from '@/features/dashboard/DashboardRouter'
import ChatPage from '@/features/chat/ChatPage'
import TasksPage from '@/features/tasks/TasksPage'
import AnnouncementsPage from '@/features/announcements/AnnouncementsPage'
import NotificationsPage from '@/features/notifications/NotificationsPage'
import ProfilePage from '@/features/profile/ProfilePage'
import AdminDashboard from '@/features/admin/AdminDashboard'
import AssignmentPage from '@/features/admin/AssignmentPage'
import AdminSearchPage from '@/features/admin/AdminSearchPage'
import UserDetailPage from '@/features/admin/UserDetailPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/staff-login" element={<StaffLoginPage />} />

      {/* Any authenticated role */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardRouter />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* Admin-only pages */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route element={<AppLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/assignment" element={<AssignmentPage />} />
          <Route path="/admin/search" element={<AdminSearchPage />} />
          <Route path="/admin/student/:id" element={<UserDetailPage />} />
          <Route path="/admin/lecturer/:id" element={<UserDetailPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
