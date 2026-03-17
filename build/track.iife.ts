import { createAnalyticsClient } from '../src/analytics/client'

const script = document.currentScript as HTMLScriptElement | null
if (script) {
  const projectId = script.getAttribute('data-project')
  if (projectId) {
    const endpoint = script.src.replace(/\/track\.js$/, '')

    createAnalyticsClient({
      projectId,
      endpoint,
      autoCapture: true,
    })
  }
}
