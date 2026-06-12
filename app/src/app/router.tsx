import { createBrowserRouter } from 'react-router-dom'
import { RequireRole } from './RequireRole'
import { RootRedirect } from './RootRedirect'
import { AuthLayout } from './layouts/AuthLayout'
import { StudentLayout } from './layouts/StudentLayout'
import { TeacherLayout } from './layouts/TeacherLayout'
import { ParentLayout } from './layouts/ParentLayout'
import { PrincipalLayout } from './layouts/PrincipalLayout'
import { LoginPage } from '../pages/auth/LoginPage'
import { TeacherRegisterPage } from '../pages/auth/TeacherRegisterPage'
import { ParentRegisterPage } from '../pages/auth/ParentRegisterPage'
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage'
import { ForgotUsernamePage } from '../pages/auth/ForgotUsernamePage'
import { FirstLoginPage } from '../pages/auth/FirstLoginPage'
import {
  ParentHomePage,
  PrincipalHomePage,
  StudentHomePage,
  TeacherHomePage,
} from '../pages/dashboards'
import { SectionPlaceholderPage } from '../pages/SectionPlaceholderPage'
import { NotFoundPage } from '../pages/NotFoundPage'

// Served under https://confiddo.in/app/ (vite base '/app/').
export const router = createBrowserRouter(
  [
    { path: '/', element: <RootRedirect /> },

    // Public auth shell (navy split panel)
    {
      element: <AuthLayout />,
      children: [
        { path: '/login', element: <LoginPage /> },
        { path: '/register/teacher', element: <TeacherRegisterPage /> },
        { path: '/register/parent', element: <ParentRegisterPage /> },
        { path: '/forgot-password', element: <ForgotPasswordPage /> },
        { path: '/forgot-username', element: <ForgotUsernamePage /> },
        // Authenticated, but pre-role-gate (mandatory password change)
        { path: '/first-login', element: <FirstLoginPage /> },
      ],
    },

    // Role-gated shells
    {
      path: '/student',
      element: (
        <RequireRole role="student">
          <StudentLayout />
        </RequireRole>
      ),
      children: [
        { index: true, element: <StudentHomePage /> },
        { path: '*', element: <SectionPlaceholderPage /> },
      ],
    },
    {
      path: '/teacher',
      element: (
        <RequireRole role="teacher">
          <TeacherLayout />
        </RequireRole>
      ),
      children: [
        { index: true, element: <TeacherHomePage /> },
        { path: '*', element: <SectionPlaceholderPage /> },
      ],
    },
    {
      path: '/parent',
      element: (
        <RequireRole role="parent">
          <ParentLayout />
        </RequireRole>
      ),
      children: [
        { index: true, element: <ParentHomePage /> },
        { path: '*', element: <SectionPlaceholderPage /> },
      ],
    },
    {
      path: '/principal',
      element: (
        <RequireRole role="principal">
          <PrincipalLayout />
        </RequireRole>
      ),
      children: [
        { index: true, element: <PrincipalHomePage /> },
        { path: '*', element: <SectionPlaceholderPage /> },
      ],
    },

    { path: '*', element: <NotFoundPage /> },
  ],
  { basename: '/app' },
)
