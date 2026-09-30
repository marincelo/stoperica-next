const BASE_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
  }
}

let unauthorizedHandler: (() => void) | null = null

export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler
}

type Query = Record<string, string | number | undefined | null>

export async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  options: { query?: Query; body?: unknown } = {},
): Promise<T> {
  const url = new URL(BASE_URL + path, window.location.origin)
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  }

  const headers: Record<string, string> = { 'x-stoperica-client': '1' }
  if (options.body !== undefined) headers['content-type'] = 'application/json'

  const response = await fetch(url, {
    method,
    headers,
    credentials: 'include',
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) unauthorizedHandler?.()
    throw new ApiError(response.status, data?.message ?? `Greška ${response.status}`, data?.details)
  }
  return data as T
}

/** Downloads a file response and saves it under the server-provided name (Content-Disposition). */
export async function download(path: string, fallbackName: string): Promise<void> {
  const response = await fetch(BASE_URL + path, { credentials: 'include', headers: { 'x-stoperica-client': '1' } })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    if (response.status === 401) unauthorizedHandler?.()
    throw new ApiError(response.status, data?.message ?? `Greška ${response.status}`)
  }
  const disposition = response.headers.get('content-disposition') ?? ''
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1]
  const name = encoded ? decodeURIComponent(encoded) : fallbackName

  const url = URL.createObjectURL(await response.blob())
  const link = Object.assign(document.createElement('a'), { href: url, download: name })
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const http = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
}
