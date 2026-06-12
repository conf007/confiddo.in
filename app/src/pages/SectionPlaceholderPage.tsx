import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

/** Rendered for in-shell routes whose feature phase hasn't shipped yet. */
export function SectionPlaceholderPage() {
  const navigate = useNavigate()
  return (
    <Card padded={false}>
      <EmptyState
        icon="sparkles"
        title="This section is coming online"
        description="We're bringing the app to the web piece by piece. This part isn't ready yet — check back soon."
        action={
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Go back
          </Button>
        }
      />
    </Card>
  )
}
