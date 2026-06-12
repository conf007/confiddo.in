/** Back-link + title header shared by all per-child parent pages. */
import { Link } from 'react-router-dom'
import { Icon } from '../icons'

export function ChildPageHeader({
  childId,
  title,
  subtitle,
}: {
  childId: string
  title: string
  subtitle?: string
}) {
  return (
    <div>
      <Link
        to={`/parent/children/${childId}`}
        className="inline-flex h-10 items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-light"
      >
        <Icon name="arrow-left" className="h-4 w-4" />
        Back to overview
      </Link>
      <h1 className="mt-1 text-2xl font-bold text-ink">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
    </div>
  )
}
