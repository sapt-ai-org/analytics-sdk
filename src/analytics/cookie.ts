export function getVisitorId(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)_sapt_vid=([^;]+)/)
  return match ? match[1] : null
}
