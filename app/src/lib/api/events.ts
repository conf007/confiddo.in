import { apiData } from './envelope'

export interface BehaviouralEvent {
  event_type: string
  attempt_id: string | null
  client_timestamp: string
  sequence_number: number
  data: Record<string, unknown>
}

export function postEventBatch(
  sessionId: string,
  events: BehaviouralEvent[],
  keepalive = false,
): Promise<{ received: number; processed: number }> {
  return apiData('/events/batch', { method: 'POST', body: { session_id: sessionId, events }, keepalive })
}
