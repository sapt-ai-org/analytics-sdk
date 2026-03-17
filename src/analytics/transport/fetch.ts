import type { EventPayload } from '../types'

export async function sendEvents(
  endpoint: string,
  payload: EventPayload
): Promise<{ vid?: string }> {
  const res = await fetch(`${endpoint}/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
    keepalive: true,
  })
  const json = (await res.json()) as { vid?: string }
  return { vid: json.vid }
}
