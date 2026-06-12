/**
 * Every Confiddo backend endpoint wraps its payload:
 *   { "success": true, "data": <payload> }
 * (backend/app/utils/helpers.py api_response). This helper unwraps it so
 * feature modules deal in payload types only. Transport stays in client.ts.
 */
import { api } from './client'

export interface Envelope<T> {
  success: boolean
  data: T
}

type ApiOptions = Parameters<typeof api>[1]

export async function apiData<T>(path: string, opts?: ApiOptions): Promise<T> {
  const envelope = await api<Envelope<T>>(path, opts)
  return envelope.data
}
