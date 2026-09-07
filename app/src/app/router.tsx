/* eslint-disable react-refresh/only-export-components -- route table: the lazy page
   bindings below are route entries, not a component module (WS-C code splitting). */
import { Suspense, lazy, type ComponentType } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { Spinner } from '../components/ui/Spinner'

/**
 * WS-C code splitting: every page is a lazy route-level chunk; only the shell (layouts,
 * role gate, spinner, not-found) ships in the initial bundle. `lz()` wraps a lazy page in a
 * Suspense boundary so navigation shows a spinner instead of blanking the layout.
 */
function lz(Page: ComponentType) {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      }
    >
      <Page />
    </Suspense>
  )
}
import { RequireRole } from './RequireRole'
import { RootRedirect } from './RootRedirect'
import { AuthLayout } from './layouts/AuthLayout'
import { StudentLayout } from './layouts/StudentLayout'
import { TeacherLayout } from './layouts/TeacherLayout'
import { ParentLayout } from './layouts/ParentLayout'
import { PrincipalLayout } from './layouts/PrincipalLayout'
const LoginPage = lazy(() => import('../pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const TeacherRegisterPage = lazy(() => import('../pages/auth/TeacherRegisterPage').then((m) => ({ default: m.TeacherRegisterPage })))
const ParentRegisterPage = lazy(() => import('../pages/auth/ParentRegisterPage').then((m) => ({ default: m.ParentRegisterPage })))
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })))
const ForgotUsernamePage = lazy(() => import('../pages/auth/ForgotUsernamePage').then((m) => ({ default: m.ForgotUsernamePage })))
const FirstLoginPage = lazy(() => import('../pages/auth/FirstLoginPage').then((m) => ({ default: m.FirstLoginPage })))
const NotificationsPage = lazy(() => import('../pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })))
import { SectionPlaceholderPage } from '../pages/SectionPlaceholderPage'
import { NotFoundPage } from '../pages/NotFoundPage'
const StudentHomePage = lazy(() => import('../pages/student/HomePage').then((m) => ({ default: m.StudentHomePage })))
const TestStartPage = lazy(() => import('../pages/student/TestStartPage').then((m) => ({ default: m.TestStartPage })))
const QuestionPage = lazy(() => import('../pages/student/QuestionPage').then((m) => ({ default: m.QuestionPage })))
const ReviewPage = lazy(() => import('../pages/student/ReviewPage').then((m) => ({ default: m.ReviewPage })))
const SessionDonePage = lazy(() => import('../pages/student/SessionDonePage').then((m) => ({ default: m.SessionDonePage })))
const ResultsPage = lazy(() => import('../pages/student/ResultsPage').then((m) => ({ default: m.ResultsPage })))
const StudentProgressPage = lazy(() => import('../pages/student/ProgressPage').then((m) => ({ default: m.StudentProgressPage })))
const BadgesPage = lazy(() => import('../pages/student/BadgesPage').then((m) => ({ default: m.BadgesPage })))
const CharactersPage = lazy(() => import('../pages/student/CharactersPage').then((m) => ({ default: m.CharactersPage })))
const ClassProgressPage = lazy(() => import('../pages/student/ClassProgressPage').then((m) => ({ default: m.ClassProgressPage })))
const LinkParentPage = lazy(() => import('../pages/student/LinkParentPage').then((m) => ({ default: m.LinkParentPage })))
const StudentProfilePage = lazy(() => import('../pages/student/ProfilePage').then((m) => ({ default: m.StudentProfilePage })))
const XpRulesPage = lazy(() => import('../pages/student/XpRulesPage').then((m) => ({ default: m.XpRulesPage })))
const ClassListPage = lazy(() => import('../pages/teacher/ClassListPage').then((m) => ({ default: m.ClassListPage })))
const ClassOverviewPage = lazy(() => import('../pages/teacher/ClassOverviewPage').then((m) => ({ default: m.ClassOverviewPage })))
const PaperFlowPage = lazy(() => import('../pages/teacher/PaperFlowPage').then((m) => ({ default: m.PaperFlowPage })))
const TestStatusPage = lazy(() => import('../pages/teacher/TestStatusPage').then((m) => ({ default: m.TestStatusPage })))
const TestDetailPage = lazy(() => import('../pages/teacher/TestDetailPage').then((m) => ({ default: m.TestDetailPage })))
const ReviewQueuePage = lazy(() => import('../pages/teacher/ReviewQueuePage').then((m) => ({ default: m.ReviewQueuePage })))
const StudentDetailPage = lazy(() => import('../pages/teacher/StudentDetailPage').then((m) => ({ default: m.StudentDetailPage })))
const AnalyticsPage = lazy(() => import('../pages/teacher/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })))
const NotificationSettingsPage = lazy(() => import('../pages/teacher/NotificationSettingsPage').then((m) => ({ default: m.NotificationSettingsPage })))
const ParentRoot = lazy(() => import('../pages/parent/ParentRoot').then((m) => ({ default: m.ParentRoot })))
const ChildrenPage = lazy(() => import('../pages/parent/ChildrenPage').then((m) => ({ default: m.ChildrenPage })))
const ChildOverviewPage = lazy(() => import('../pages/parent/ChildOverviewPage').then((m) => ({ default: m.ChildOverviewPage })))
const ActivityFeedPage = lazy(() => import('../pages/parent/ChildToolsPages').then((m) => ({ default: m.ActivityFeedPage })))
const EngagementPage = lazy(() => import('../pages/parent/ChildToolsPages').then((m) => ({ default: m.EngagementPage })))
const GoalsPage = lazy(() => import('../pages/parent/ChildToolsPages').then((m) => ({ default: m.GoalsPage })))
const StartersPage = lazy(() => import('../pages/parent/ChildToolsPages').then((m) => ({ default: m.StartersPage })))
const AchievementsPage = lazy(() => import('../pages/parent/ChildMorePages').then((m) => ({ default: m.AchievementsPage })))
const InsightsPage = lazy(() => import('../pages/parent/ChildMorePages').then((m) => ({ default: m.InsightsPage })))
const MonthlyReportPage = lazy(() => import('../pages/parent/ChildMorePages').then((m) => ({ default: m.MonthlyReportPage })))
const PastSummariesPage = lazy(() => import('../pages/parent/ChildMorePages').then((m) => ({ default: m.PastSummariesPage })))
const ReadinessPage = lazy(() => import('../pages/parent/ChildMorePages').then((m) => ({ default: m.ReadinessPage })))
const SummaryDetailPage = lazy(() => import('../pages/parent/ChildMorePages').then((m) => ({ default: m.SummaryDetailPage })))
const LinkChildPage = lazy(() => import('../pages/parent/LinkChildPage').then((m) => ({ default: m.LinkChildPage })))
const DevicesPage = lazy(() => import('../pages/parent/DevicesPage').then((m) => ({ default: m.DevicesPage })))
const ExamGuidePage = lazy(() => import('../pages/parent/ExamGuidePage').then((m) => ({ default: m.ExamGuidePage })))
const ParentProfilePage = lazy(() => import('../pages/parent/ProfilePage').then((m) => ({ default: m.ParentProfilePage })))
const PrincipalDashboardPage = lazy(() => import('../pages/principal/DashboardPage').then((m) => ({ default: m.PrincipalDashboardPage })))
const HeatmapPage = lazy(() => import('../pages/principal/HeatmapPage').then((m) => ({ default: m.HeatmapPage })))
const PrincipalClassDetailPage = lazy(() => import('../pages/principal/ClassesPage').then((m) => ({ default: m.PrincipalClassDetailPage })))
const PrincipalClassesPage = lazy(() => import('../pages/principal/ClassesPage').then((m) => ({ default: m.PrincipalClassesPage })))
const DirectoryPage = lazy(() => import('../pages/principal/DirectoryPage').then((m) => ({ default: m.DirectoryPage })))
const TeacherDetailPage = lazy(() => import('../pages/principal/DirectoryPage').then((m) => ({ default: m.TeacherDetailPage })))
const PrincipalStudentDetailPage = lazy(() => import('../pages/principal/StudentsPage').then((m) => ({ default: m.PrincipalStudentDetailPage })))
const StudentsPage = lazy(() => import('../pages/principal/StudentsPage').then((m) => ({ default: m.StudentsPage })))
const PrincipalProfilePage = lazy(() => import('../pages/principal/ProfilePage').then((m) => ({ default: m.PrincipalProfilePage })))

// Served under https://confiddo.in/app/ (vite base '/app/').
export const router = createBrowserRouter(
  [
    { path: '/', element: <RootRedirect /> },

    // Public auth shell (navy split panel)
    {
      element: <AuthLayout />,
      children: [
        { path: '/login', element: lz(LoginPage) },
        { path: '/register/teacher', element: lz(TeacherRegisterPage) },
        { path: '/register/parent', element: lz(ParentRegisterPage) },
        { path: '/forgot-password', element: lz(ForgotPasswordPage) },
        { path: '/forgot-username', element: lz(ForgotUsernamePage) },
        // Authenticated, but pre-role-gate (mandatory password change)
        { path: '/first-login', element: lz(FirstLoginPage) },
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
        { index: true, element: lz(StudentHomePage) },
        { path: 'tests/:testId/start', element: lz(TestStartPage) },
        { path: 'tests/:testId/results', element: lz(ResultsPage) },
        { path: 'sessions/:sid/q/:n', element: lz(QuestionPage) },
        { path: 'sessions/:sid/review', element: lz(ReviewPage) },
        { path: 'sessions/:sid/done', element: lz(SessionDonePage) },
        { path: 'progress', element: lz(StudentProgressPage) },
        { path: 'badges', element: lz(BadgesPage) },
        { path: 'characters', element: lz(CharactersPage) },
        { path: 'class-progress', element: lz(ClassProgressPage) },
        { path: 'link-parent', element: lz(LinkParentPage) },
        { path: 'profile', element: lz(StudentProfilePage) },
        { path: 'xp-rules', element: lz(XpRulesPage) },
        { path: 'notifications', element: lz(NotificationsPage) },
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
        { index: true, element: lz(ClassListPage) },
        { path: 'classes/:classId', element: lz(ClassOverviewPage) },
        { path: 'classes/:classId/review', element: lz(ReviewQueuePage) },
        { path: 'paper/new', element: lz(PaperFlowPage) },
        { path: 'tests', element: lz(TestStatusPage) },
        { path: 'tests/:testId', element: lz(TestDetailPage) },
        { path: 'students/:studentId', element: lz(StudentDetailPage) },
        { path: 'analytics', element: lz(AnalyticsPage) },
        { path: 'settings', element: lz(NotificationSettingsPage) },
        { path: 'notifications', element: lz(NotificationsPage) },
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
        {
          element: lz(ParentRoot),
          children: [
            { index: true, element: lz(ChildrenPage) },
            { path: 'children/:childId', element: lz(ChildOverviewPage) },
            { path: 'children/:childId/activity', element: lz(ActivityFeedPage) },
            { path: 'children/:childId/engagement', element: lz(EngagementPage) },
            { path: 'children/:childId/starters', element: lz(StartersPage) },
            { path: 'children/:childId/goals', element: lz(GoalsPage) },
            { path: 'children/:childId/insights', element: lz(InsightsPage) },
            { path: 'children/:childId/monthly', element: lz(MonthlyReportPage) },
            { path: 'children/:childId/achievements', element: lz(AchievementsPage) },
            { path: 'children/:childId/readiness', element: lz(ReadinessPage) },
            { path: 'children/:childId/summaries', element: lz(PastSummariesPage) },
            {
              path: 'children/:childId/summaries/:summaryId',
              element: lz(SummaryDetailPage),
            },
            { path: 'link-child', element: lz(LinkChildPage) },
            { path: 'devices', element: lz(DevicesPage) },
            { path: 'exam-guide', element: lz(ExamGuidePage) },
            { path: 'profile', element: lz(ParentProfilePage) },
            { path: 'notifications', element: lz(NotificationsPage) },
        { path: '*', element: <SectionPlaceholderPage /> },
          ],
        },
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
        { index: true, element: lz(PrincipalDashboardPage) },
        { path: 'heatmap', element: lz(HeatmapPage) },
        { path: 'classes', element: lz(PrincipalClassesPage) },
        { path: 'classes/:classId', element: lz(PrincipalClassDetailPage) },
        { path: 'directory', element: lz(DirectoryPage) },
        { path: 'directory/:teacherId', element: lz(TeacherDetailPage) },
        { path: 'students', element: lz(StudentsPage) },
        { path: 'students/:studentId', element: lz(PrincipalStudentDetailPage) },
        { path: 'profile', element: lz(PrincipalProfilePage) },
        { path: 'notifications', element: lz(NotificationsPage) },
        { path: '*', element: <SectionPlaceholderPage /> },
      ],
    },

    { path: '*', element: <NotFoundPage /> },
  ],
  { basename: '/app' },
)
