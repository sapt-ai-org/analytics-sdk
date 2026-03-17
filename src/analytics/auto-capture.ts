/** Serialize an unknown value to a string for safe logging. */
function serializeUnknown(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return value
  if (value instanceof Error) {
    return JSON.stringify({ ...value, stack: value.stack })
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

type TrackFn = (event: string, properties?: Record<string, string>) => void

export function initAutoCapture(track: TrackFn): () => void {
  const listeners: Array<{
    target: EventTarget
    event: string
    handler: EventListenerOrEventListenerObject
    options?: AddEventListenerOptions
  }> = []

  function on(
    target: EventTarget,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ) {
    target.addEventListener(event, handler, options)
    listeners.push({ target, event, handler, options })
  }

  let url = location.href
  let pathname = location.pathname

  // --- Pageview ---
  track('pageview', { pathname })

  // --- Engagement state ---
  let engStart = Date.now()
  let engTotal = 0
  let engVisible = !document.hidden

  function sendEngagement() {
    let dur = engTotal
    if (engVisible) dur += Date.now() - engStart
    if (dur > 0) track('engagement', { duration_ms: String(Math.round(dur)) })
    engTotal = 0
    engStart = Date.now()
  }

  // --- Scroll state ---
  let scrollFired: Record<number, boolean> = {}

  // --- SPA navigation ---
  const origPush = history.pushState.bind(history)
  const origReplace = history.replaceState.bind(history)

  function onNav() {
    const newUrl = location.href
    if (newUrl === url) return
    sendEngagement()
    url = newUrl
    pathname = location.pathname
    track('pageview', { pathname })
    scrollFired = {}
    engStart = Date.now()
  }

  history.pushState = function (...args) {
    origPush(...args)
    onNav()
  }
  history.replaceState = function (...args) {
    origReplace(...args)
    onNav()
  }
  on(window, 'popstate', onNav)

  // --- Click tracking ---
  const FILE_RE = /\.(pdf|docx?|xlsx?|csv|pptx?|zip|rar|gz|tar)$/i
  let lastClickEl: EventTarget | null = null
  let clickCount = 0
  let clickTimer: ReturnType<typeof setTimeout> | null = null

  on(
    document,
    'click',
    (e: Event) => {
      const target = e.target as HTMLElement | null
      if (!target?.tagName) return
      const el = target.closest('a,button,[role=button]') || target
      const tag = el.tagName.toLowerCase()
      const text = (el.textContent || '').trim().slice(0, 100)
      const id = el.id || undefined
      const cls =
        el.className && typeof el.className === 'string' ? el.className.slice(0, 200) : undefined
      const href = (el as HTMLAnchorElement).href || el.getAttribute('href') || undefined

      if (el === lastClickEl) {
        clickCount++
        if (clickTimer) clearTimeout(clickTimer)
        clickTimer = setTimeout(() => {
          clickCount = 0
          lastClickEl = null
        }, 1000)
        if (clickCount >= 3) {
          track('rage_click', { tag, text, click_count: String(clickCount) })
          clickCount = 0
          lastClickEl = null
          return
        }
      } else {
        lastClickEl = el
        clickCount = 1
        if (clickTimer) clearTimeout(clickTimer)
        clickTimer = setTimeout(() => {
          clickCount = 0
          lastClickEl = null
        }, 1000)
      }

      if (href) {
        if (href.indexOf('tel:') === 0) {
          track('phone_click', { phone_number: href.replace('tel:', ''), tag })
          return
        }
        if (href.indexOf('mailto:') === 0) {
          const em = href.replace('mailto:', '').split('?')[0]
          track('email_click', { email_domain: em.split('@')[1] || '', tag })
          return
        }
        if (FILE_RE.test(href)) {
          const ext = href.match(FILE_RE)
          track('file_download', {
            file_url: href,
            file_type: ext ? ext[1] : '',
            tag,
          })
          return
        }
        try {
          if (new URL(href, location.origin).host !== location.host) {
            track('outbound_click', {
              outbound_url: href,
              tag,
              text,
              ...(id && { id }),
              ...(cls && { classes: cls }),
            })
            return
          }
        } catch {
          // ignore invalid URLs
        }
      }

      track('click', {
        tag,
        text,
        ...(id && { id }),
        ...(cls && { classes: cls }),
        ...(href && { href }),
      })
    },
    { capture: true }
  )

  // --- Form submit ---
  on(
    document,
    'submit',
    (e: Event) => {
      const f = e.target as HTMLFormElement | null
      if (!f || f.tagName !== 'FORM') return
      track('form_submit', {
        ...(f.id && { form_id: f.id }),
        ...(f.action && { form_action: f.action }),
        form_method: (f.method || 'GET').toUpperCase(),
      })
    },
    { capture: true }
  )

  // --- Scroll depth ---
  let scrollRaf = false
  let scrollLast = 0

  function checkScroll() {
    scrollRaf = false
    const h = document.documentElement.scrollHeight - window.innerHeight
    if (h <= 0) return
    const pct = Math.round((window.scrollY / h) * 100)
    for (const t of [25, 50, 75, 100]) {
      if (pct >= t && !scrollFired[t]) {
        scrollFired[t] = true
        track('scroll_depth', { depth: String(t) })
      }
    }
  }

  on(
    window,
    'scroll',
    () => {
      const n = Date.now()
      if (!scrollRaf && n - scrollLast > 250) {
        scrollLast = n
        scrollRaf = true
        requestAnimationFrame(checkScroll)
      }
    },
    { passive: true, capture: true }
  )

  // --- Engagement visibility ---
  on(document, 'visibilitychange', () => {
    if (document.hidden) {
      if (engVisible) engTotal += Date.now() - engStart
      engVisible = false
    } else {
      engStart = Date.now()
      engVisible = true
    }
  })

  // --- JS Errors ---
  const prevOnError = window.onerror
  window.onerror = (msg, source, line, col) => {
    track('js_error', {
      message: serializeUnknown(msg).slice(0, 500),
      ...(source && { source: String(source) }),
      ...(line && { line: String(line) }),
      ...(col && { col: String(col) }),
    })
    if (prevOnError) prevOnError.call(window, msg, source, line, col)
    return false
  }

  on(window, 'unhandledrejection', (e: Event) => {
    const reason: unknown = (e as PromiseRejectionEvent).reason
    track('js_error', { message: serializeUnknown(reason).slice(0, 500) })
  })

  // --- Copy ---
  on(document, 'copy', () => {
    const sel = window.getSelection()
    track('copy', { content_length: String(sel ? sel.toString().length : 0) })
  })

  // --- Print ---
  on(window, 'beforeprint', () => {
    track('print')
  })

  return () => {
    for (const { target, event, handler, options } of listeners) {
      target.removeEventListener(event, handler, options)
    }
    history.pushState = origPush
    history.replaceState = origReplace
    window.onerror = prevOnError
  }
}
