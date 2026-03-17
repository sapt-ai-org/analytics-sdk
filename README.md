# @sapt/analytics

Lightweight analytics SDK. Drop-in script tag or programmatic client for pageviews, clicks, scroll depth, engagement time, and custom events.

## Install

```bash
npm install @sapt/analytics
```

## Script tag (zero config)

Add this to your site. Auto-captures pageviews, clicks, scroll depth, engagement, form submissions, and errors.

```html
<script src="https://cdn.sapt.ai/track.js" data-project="YOUR_PROJECT_ID"></script>
```

## Programmatic usage

```typescript
import { createAnalyticsClient } from '@sapt/analytics'

const analytics = createAnalyticsClient({
  projectId: 'YOUR_PROJECT_ID',
  endpoint: 'https://ingest.sapt.ai',
})

// Auto-captures pageviews, clicks, scroll depth, etc. by default
// Or track custom events:
analytics.track('signup', { plan: 'starter' })
analytics.identify({ email: 'user@example.com' })
analytics.page()
```

## Configuration

```typescript
createAnalyticsClient({
  projectId: string       // Required. Your Sapt project ID.
  endpoint: string        // Required. Ingest endpoint URL.
  autoCapture?: boolean   // Auto-capture events (default: true in browser)
  flushInterval?: number  // Batch flush interval in ms (default: 5000)
  maxBatchSize?: number   // Max events per batch (default: 10)
  identity?: Record<string, string>  // Default identity traits
})
```

## Auto-captured events

| Event | Description |
|-------|-------------|
| `pageview` | Page load and SPA navigation |
| `click` | Clicks on links, buttons, interactive elements |
| `outbound_click` | Clicks to external domains |
| `scroll_depth` | 25%, 50%, 75%, 100% scroll milestones |
| `engagement` | Active time on page (accounts for tab visibility) |
| `form_submit` | Form submissions |
| `rage_click` | 3+ rapid clicks on the same element |
| `file_download` | Clicks on PDF, DOCX, CSV, etc. |
| `phone_click` | Clicks on tel: links |
| `email_click` | Clicks on mailto: links |
| `js_error` | Uncaught JS errors and unhandled promise rejections |
| `copy` | Text copy events |
| `print` | Print events |

## API

### `analytics.track(event, properties?)`

Track a custom event.

### `analytics.identify(traits)`

Set identity traits that are sent with all subsequent events.

### `analytics.page(properties?)`

Manually track a pageview.

### `analytics.flush()`

Force flush the event queue.

### `analytics.shutdown()`

Flush remaining events and clean up listeners.

## License

MIT
