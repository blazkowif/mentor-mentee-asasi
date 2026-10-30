import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppLayout from '@/layouts/AppLayout'
import AuthPage from '@/features/auth/AuthPage'
import DashboardRouter from '@/features/dashboard/DashboardRouter'
import ChatPage from '@/features/chat/ChatPage'
import TasksPage from '@/features/tasks/TasksPage'
import AnnouncementsPage from '@/features/announcements/AnnouncementsPage'
import NotificationsPage from '@/features/notifications/NotificationsPage'
import ProfilePage from '@/features/profile/ProfilePage'
import AssignmentPage from '@/features/admin/AssignmentPage'
import AdminSearchPage from '@/features/admin/AdminSearchPage'
import UserDetailPage from '@/features/admin/UserDetailPage'
import AdminControlPage from '@/features/admin/AdminControlPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/staff-login" element={<AuthPage />} />

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
          <Route path="/admin/assignment" element={<AssignmentPage />} />
          <Route path="/admin/search" element={<AdminSearchPage />} />
          <Route path="/admin/student/:id" element={<UserDetailPage />} />
          <Route path="/admin/lecturer/:id" element={<UserDetailPage />} />
          <Route path="/admin/control" element={<AdminControlPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
