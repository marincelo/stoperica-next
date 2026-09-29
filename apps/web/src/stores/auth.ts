import type { SessionUser, SignupRequest } from '@stoperica/shared'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { ApiError, http } from '@/api/http'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<SessionUser | null>(null)
  const checked = ref(false)
  let pending: Promise<SessionUser | null> | null = null

  const isAdmin = computed(() => user.value?.admin === true)
  const displayName = computed(() =>
    user.value ? [user.value.firstName, user.value.lastName].filter(Boolean).join(' ') || user.value.email : '',
  )

  async function fetchMe() {
    try {
      user.value = await http.get<SessionUser>('/auth/me')
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error
      user.value = null
    } finally {
      checked.value = true
    }
    return user.value
  }

  /** Fetches the session once; concurrent callers share the request. */
  function ensureChecked() {
    if (checked.value) return Promise.resolve(user.value)
    pending ??= fetchMe().finally(() => {
      pending = null
    })
    return pending
  }

  async function login(email: string, phone: string) {
    user.value = await http.post<SessionUser>('/auth/login', { email, phone })
    checked.value = true
  }

  async function signup(profile: SignupRequest) {
    user.value = await http.post<SessionUser>('/auth/signup', profile)
    checked.value = true
  }

  async function logout() {
    await http.post('/auth/logout')
    clear()
  }

  function clear() {
    user.value = null
  }

  return { user, checked, isAdmin, displayName, ensureChecked, fetchMe, login, signup, logout, clear }
})
