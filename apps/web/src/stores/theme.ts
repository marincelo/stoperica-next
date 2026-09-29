import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

type Mode = 'dark' | 'light'
const STORAGE_KEY = 'stoperica:theme'

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<Mode>(localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark')
  const isDark = computed(() => mode.value === 'dark')

  watch(
    mode,
    (value) => {
      localStorage.setItem(STORAGE_KEY, value)
      document.documentElement.style.colorScheme = value
      document.documentElement.style.background = value === 'dark' ? '#101014' : '#fff'
    },
    { immediate: true },
  )

  function toggle() {
    mode.value = isDark.value ? 'light' : 'dark'
  }

  return { mode, isDark, toggle }
})
