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
} from '../pages/dashboards'
import { SectionPlaceholderPage } from '../pages/SectionPlaceholderPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { StudentHomePage } from '../pages/student/HomePage'
import { TestStartPage } from '../pages/student/TestStartPage'
import { QuestionPage } from '../pages/student/QuestionPage'
import { ReviewPage } from '../pages/student/ReviewPage'
import { SessionDonePage } from '../pages/student/SessionDonePage'
import { ResultsPage } from '../pages/student/ResultsPage'
import { StudentProgressPage } from '../pages/student/ProgressPage'
import { BadgesPage } from '../pages/student/BadgesPage'
import { CharactersPage } from '../pages/student/CharactersPage'
import { ClassProgressPage } from '../pages/student/ClassProgressPage'
import { LinkParentPage } from '../pages/student/LinkParentPage'
import { StudentProfilePage } from '../pages/student/ProfilePage'
import { XpRulesPage } from '../pages/student/XpRulesPage'
import { ClassListPage } from '../pages/teacher/ClassListPage'
import { ClassOverviewPage } from '../pages/teacher/ClassOverviewPage'
import { PaperFlowPage } from '../pages/teacher/PaperFlowPage'
import { TestStatusPage } from '../pages/teacher/TestStatusPage'
import { TestDetailPage } from '../pages/teacher/TestDetailPage'
import { ReviewQueuePage } from '../pages/teacher/ReviewQueuePage'
import { StudentDetailPage } from '../pages/teacher/StudentDetailPage'
import { AnalyticsPage } from '../pages/teacher/AnalyticsPage'
import { NotificationSettingsPage } from '../pages/teacher/NotificationSettingsPage'

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
        { path: 'tests/:testId/start', element: <TestStartPage /> },
        { path: 'tests/:testId/results', element: <ResultsPage /> },
        { path: 'sessions/:sid/q/:n', element: <QuestionPage /> },
        { path: 'sessions/:sid/review', element: <ReviewPage /> },
        { path: 'sessions/:sid/done', element: <SessionDonePage /> },
        { path: 'progress', element: <StudentProgressPage /> },
        { path: 'badges', element: <BadgesPage /> },
        { path: 'characters', element: <CharactersPage /> },
        { path: 'class-progress', element: <ClassProgressPage /> },
        { path: 'link-parent', element: <LinkParentPage /> },
        { path: 'profile', element: <StudentProfilePage /> },
        { path: 'xp-rules', element: <XpRulesPage /> },
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
        { index: true, element: <ClassListPage /> },
        { path: 'classes/:classId', element: <ClassOverviewPage /> },
        { path: 'classes/:classId/review', element: <ReviewQueuePage /> },
        { path: 'paper/new', element: <PaperFlowPage /> },
        { path: 'tests', element: <TestStatusPage /> },
        { path: 'tests/:testId', element: <TestDetailPage /> },
        { path: 'students/:studentId', element: <StudentDetailPage /> },
        { path: 'analytics', element: <AnalyticsPage /> },
        { path: 'settings', element: <NotificationSettingsPage /> },
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
