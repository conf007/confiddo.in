import { postEventBatch, type BehaviouralEvent } from '../../../lib/api/events'

const FLUSH_AT = 10
const key = (sid: string) => `confiddo.events.${sid}`

interface Buffer {
  seq: number
  pending: BehaviouralEvent[]
}

function load(sid: string): Buffer {
  try {
    const raw = sessionStorage.getItem(key(sid))
    return raw ? (JSON.parse(raw) as Buffer) : { seq: 0, pending: [] }
  } catch {
    return { seq: 0, pending: [] }
  }
}

function save(sid: string, b: Buffer) {
  try {
    sessionStorage.setItem(key(sid), JSON.stringify(b))
  } catch {
    /* storage unavailable */
  }
}

export function recordEvent(sid: string, type: string, questionId: string | null = null, data: Record<string, unknown> = {}) {
  const b = load(sid)
  b.seq += 1
  b.pending.push({
    event_type: type,
    attempt_id: questionId,
    client_timestamp: new Date().toISOString(),
    sequence_number: b.seq,
    data,
  })
  save(sid, b)
  if (b.pending.length >= FLUSH_AT) void flushEvents(sid)
}

export function pendingEvents(sid: string): BehaviouralEvent[] {
  return load(sid).pending
}

export async function flushEvents(sid: string, keepalive = false): Promise<void> {
  const b = load(sid)
  if (b.pending.length === 0) return
  const batch = b.pending
  save(sid, { seq: b.seq, pending: [] })
  try {
    await postEventBatch(sid, batch, keepalive)
  } catch {
    const now = load(sid)
    save(sid, { seq: now.seq, pending: [...batch, ...now.pending] })
  }
}
