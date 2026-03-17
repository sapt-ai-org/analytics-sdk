import { initAutoCapture } from './auto-capture'
import { getVisitorId } from './cookie'
import { sendBeacon } from './transport/beacon'
import { sendEvents } from './transport/fetch'
import type {
  AnalyticsClient,
  AnalyticsConfig,
  EventOptions,
  EventPayload,
  TrackEvent,
} from './types'

const isBrowser = typeof document !== 'undefined'

export function createAnalyticsClient(config: AnalyticsConfig): AnalyticsClient {
  const {
    projectId,
    endpoint,
    flushInterval = 5000,
    maxBatchSize = 10,
    identity: defaultIdentity = {},
  } = config

  if (!projectId) throw new Error('projectId is required')
  if (!endpoint) throw new Error('endpoint is required')

  const autoCapture = config.autoCapture ?? isBrowser

  const queue: TrackEvent[] = []
  let timer: ReturnType<typeof setTimeout> | null = null
  const identityTraits: Record<string, string> = { ...defaultIdentity }
  let visitorId: string | null = isBrowser ? getVisitorId() : null
  let isFirstFlush = true
  let cleanupAutoCapture: (() => void) | null = null

  // Suppress unused variable warning — visitorId is read from cookie and
  // updated from server response for same-page-load continuity
  void visitorId

  function getPageContext(): { url: string; referrer?: string; title?: string } {
    if (!isBrowser) return { url: '' }
    return {
      url: location.href,
      referrer: document.referrer || undefined,
      title: document.title || undefined,
    }
  }

  function buildIdentity(perEventIdentity?: Record<string, string>): Record<string, string> {
    const merged: Record<string, string> = { ...identityTraits }
    if (perEventIdentity) {
      Object.assign(merged, perEventIdentity)
    }
    return merged
  }

  function buildPayload(
    events: TrackEvent[],
    perEventIdentity?: Record<string, string>
  ): EventPayload {
    const page = getPageContext()
    return {
      projectId,
      url: page.url,
      referrer: page.referrer,
      title: page.title,
      identity: buildIdentity(perEventIdentity),
      events,
    }
  }

  async function flushViaFetch(): Promise<void> {
    if (!queue.length) return
    const batch = queue.splice(0)
    const payload = buildPayload(batch)
    isFirstFlush = false
    try {
      const result = await sendEvents(endpoint, payload)
      if (result.vid && isBrowser) {
        visitorId = result.vid
      }
    } catch {
      // Fire-and-forget
    }
  }

  function flushViaBeacon(): void {
    if (!queue.length) return
    const batch = queue.splice(0)
    const payload = buildPayload(batch)
    isFirstFlush = false
    sendBeacon(endpoint, payload)
  }

  function scheduleFlush(): void {
    if (timer) return
    const delay = isFirstFlush ? 2000 : flushInterval
    timer = setTimeout(() => {
      timer = null
      void flushViaFetch()
    }, delay)
  }

  function track(
    event: string,
    properties?: Record<string, string>,
    _options?: EventOptions
  ): void {
    const trackEvent: TrackEvent = {
      name: event,
      timestamp: Date.now(),
    }
    if (properties && Object.keys(properties).length > 0) {
      trackEvent.properties = properties
    }

    queue.push(trackEvent)
    if (queue.length >= maxBatchSize) {
      void flushViaFetch()
    } else {
      scheduleFlush()
    }
  }

  function identify(traits: Record<string, string>): void {
    Object.assign(identityTraits, traits)
    track('identify', { ...traits })
  }

  function page(properties?: { pathname?: string }): void {
    const props: Record<string, string> = {}
    if (properties?.pathname) {
      props.pathname = properties.pathname
    } else if (isBrowser) {
      props.pathname = location.pathname
    }
    track('pageview', props)
  }

  function flush(): void {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    void flushViaFetch()
  }

  function shutdown(): void {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    void flushViaFetch()
    if (cleanupAutoCapture) {
      cleanupAutoCapture()
      cleanupAutoCapture = null
    }
  }

  if (isBrowser) {
    const onUnload = () => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      flushViaBeacon()
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) onUnload()
    })
    window.addEventListener('pagehide', onUnload)
  }

  if (autoCapture && isBrowser) {
    cleanupAutoCapture = initAutoCapture(track)
  }

  return { track, identify, page, flush, shutdown }
}
