/** crypto.randomUUID() is available in every Android WebView Capacitor targets, but fall back just in case. */
export function newId(prefix = ''): string {
  const raw =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return prefix ? `${prefix}_${raw}` : raw
}
