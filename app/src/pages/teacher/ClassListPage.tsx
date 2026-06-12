/**
 * /teacher — class list + actionable dashboard (Flutter parity:
 * class_list_screen.dart + teacher home dashboard).
 *
 * Endpoints:
 *   GET /teacher/classes              (teacher.py:40-54)
 *   GET /teacher/dashboard            (teacher.py:71-81)
 *   GET /teacher/assignments/pending  (teacher.py:959-990)
 *   POST /teacher/assignments/{id}/accept|reject (teacher.py:993-1156)
 */
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/icons'
import { ErrorState, LoadingState } from '../../components/teacher/PageState'
import { teacherKeys } from '../../components/teacher/hooks'
import {
  acceptAssignment,
  getPendingAssignments,
  getTeacherClasses,
  getTeacherDashboard,
  rejectAssignment,
  type DashboardTask,
} from '../../lib/api/teacher'
import { friendlyError } from '../../lib/api/errors'

function taskRoute(task: DashboardTask): string {
  switch (task.type) {
    case 'incomplete_review':
    case 'pending_review':
    case 'review_test':
      return `/teacher/classes/${task.route_param}/review${
        task.test_id ? `?test=${task.test_id}` : ''
      }`
    case 'draft_test':
      return `/teacher/paper/new?testId=${task.test_id}`
    case 'live_test':
      return task.test_id ? `/teacher/tests/${task.test_id}` : '/teacher/tests'
    case 'create_test':
      return `/teacher/paper/new?classId=${task.route_param}`
    default:
      return '/teacher'
  }
}

function TaskRow({ task }: { task: DashboardTask }) {
  const navigate = useNavigate()
  return (
    <li className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary">
        <Icon
          name={task.type === 'create_test' ? 'book' : task.type === 'draft_test' ? 'clipboard' : 'check'}
          className="h-5 w-5"
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{task.title}</p>
        <p className="truncate text-xs text-ink-muted">{task.subtitle}</p>
      </div>
      <Button size="sm" variant="secondary" onClick={() => navigate(taskRoute(task))}>
        {task.action_label}
      </Button>
    </li>
  )
}

export function ClassListPage() {
  const queryClient = useQueryClient()
  const classes = useQuery({ queryKey: teacherKeys.classes, queryFn: getTeacherClasses })
  const dashboard = useQuery({
    queryKey: teacherKeys.dashboard,
    queryFn: getTeacherDashboard,
  })
  const pending = useQuery({
    queryKey: teacherKeys.pendingAssignments,
    queryFn: getPendingAssignments,
  })

  const refreshAfterAssignment = () => {
    queryClient.invalidateQueries({ queryKey: teacherKeys.pendingAssignments })
    queryClient.invalidateQueries({ queryKey: teacherKeys.classes })
    queryClient.invalidateQueries({ queryKey: teacherKeys.dashboard })
  }
  const accept = useMutation({
    mutationFn: acceptAssignment,
    onSettled: refreshAfterAssignment,
  })
  const reject = useMutation({
    mutationFn: (id: string) => rejectAssignment(id),
    onSettled: refreshAfterAssignment,
  })

  if (classes.isLoading) return <LoadingState />
  if (!classes.data) {
    return (
      <ErrorState
        title="We couldn't load your classes"
        error={classes.error}
        onRetry={() => classes.refetch()}
        icon="users"
      />
    )
  }

  const tasks = [
    ...(dashboard.data?.continue_tasks ?? []),
    ...(dashboard.data?.pending_tasks ?? []),
  ]
  const assignments = pending.data?.assignments ?? []

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">My classes</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Reviews, tests and readiness for the classes you teach.
          </p>
        </div>
        <Link to="/teacher/paper/new">
          <Button>
            <Icon name="book" className="h-4 w-4" />
            Create test
          </Button>
        </Link>
      </div>

      {/* Pending class assignments (TeacherClass workflow) */}
      {assignments.length > 0 && (
        <Card className="border border-accent/20 bg-accent-tint/40">
          <h2 className="text-sm font-semibold text-ink">
            Class assignments awaiting your response
          </h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Your principal assigned these classes to you. Accept to start
            teaching — late acceptance can cost students consistency points.
          </p>
          {(accept.error || reject.error) && (
            <p className="mt-2 text-xs text-band-red">
              {friendlyError(accept.error ?? reject.error)}
            </p>
          )}
          <ul className="mt-3 divide-y divide-slate-100">
            {assignments.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">
                    {a.class_name}
                    {a.is_primary && (
                      <Badge tone="primary" className="ml-2">Primary</Badge>
                    )}
                  </p>
                  <p className="text-xs text-ink-muted">
                    Grade {a.grade} • {a.subject}
                    {a.assigned_at &&
                      ` • assigned ${new Date(a.assigned_at).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => accept.mutate(a.id)}
                    loading={accept.isPending && accept.variables === a.id}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => reject.mutate(a.id)}
                    loading={reject.isPending && reject.variables === a.id}
                  >
                    Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Needs your attention */}
      {tasks.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold text-ink">Needs your attention</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {tasks.map((t, i) => (
              <TaskRow key={`${t.type}-${t.route_param}-${i}`} task={t} />
            ))}
          </ul>
        </Card>
      )}

      {/* Classes grid */}
      {classes.data.classes.length === 0 ? (
        <EmptyState
          icon="school"
          title="No classes yet"
          description="Once your principal assigns you a class (and you accept), it will appear here."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.data.classes.map((c) => (
            <Link
              key={c.id}
              to={`/teacher/classes/${c.id}`}
              className="group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded-card"
            >
              <Card className="h-full transition-shadow group-hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-tint text-primary">
                    <Icon name="school" className="h-5 w-5" />
                  </span>
                  {c.has_pending_review ? (
                    <Badge tone="accent">Review pending</Badge>
                  ) : c.last_reviewed_at ? (
                    <Badge tone="success">
                      <Icon name="check" className="h-3 w-3" />
                      Reviewed
                    </Badge>
                  ) : null}
                </div>
                <h3 className="mt-3 text-base font-semibold text-ink">{c.name}</h3>
                <p className="text-xs text-ink-muted">
                  Grade {c.grade} • {c.subject}
                </p>
                <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-soft">
                  <Icon name="users" className="h-4 w-4 text-ink-muted" />
                  {c.student_count} student{c.student_count === 1 ? '' : 's'}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
