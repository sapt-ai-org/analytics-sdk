import type { EventPayload } from '../types'

export function sendBeacon(endpoint: string, payload: EventPayload): void {
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon(`${endpoint}/event`, JSON.stringify(payload))
  }
}
