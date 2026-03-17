import type { SaptConfig } from '../core/types'

export type AnalyticsConfig = SaptConfig & {
  autoCapture?: boolean
  flushInterval?: number
  maxBatchSize?: number
  identity?: Record<string, string>
}

export type EventOptions = {
  identity?: Record<string, string>
}

export type TrackEvent = {
  name: string
  timestamp: number
  properties?: Record<string, string>
}

export type EventPayload = {
  projectId: string
  url: string
  referrer?: string
  title?: string
  identity: Record<string, string>
  events: TrackEvent[]
}

export type AnalyticsClient = {
  track: (event: string, properties?: Record<string, string>, options?: EventOptions) => void
  identify: (traits: Record<string, string>) => void
  page: (properties?: { pathname?: string }) => void
  flush: () => void
  shutdown: () => void
}
