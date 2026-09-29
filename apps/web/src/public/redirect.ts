/** Only same-app paths are allowed as post-login redirects (prevents open redirects like `//evil.com`). */
export function safeRedirect(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}
