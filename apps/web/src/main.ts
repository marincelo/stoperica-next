import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { onUnauthorized } from './api/http'
import App from './App.vue'
import './styles/theme.css'
import { router } from './router'
import { useAuthStore } from './stores/auth'
import { useMetaStore } from './stores/meta'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

onUnauthorized(() => {
  useAuthStore(pinia).clear()
  useMetaStore(pinia).reset()
  const current = router.currentRoute.value
  if (current.matched.some((r) => r.meta.requiresAuth)) {
    router.push({ name: 'login', query: { redirect: current.fullPath } })
  }
})

app.mount('#app')
