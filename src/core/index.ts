export type { SaptConfig } from './types'

import type { SaptConfig } from './types'

export function createSaptClient(config: SaptConfig) {
  if (!config.projectId) throw new Error('projectId is required')
  if (!config.endpoint) throw new Error('endpoint is required')
  return { ...config }
}
