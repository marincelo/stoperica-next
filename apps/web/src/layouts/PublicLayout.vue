<script setup lang="ts">
import type { DropdownOption } from 'naive-ui'
import { NButton, NDropdown, NFlex, NLayout, NLayoutContent, NLayoutHeader, useMessage } from 'naive-ui'
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import BrandLogo from '@/components/BrandLogo.vue'
import MobileTabBar from '@/components/MobileTabBar.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { ICONS, SECTIONS, useNavItems } from '@/composables/useNavItems'
import { useAuthStore } from '@/stores/auth'
import { useMetaStore } from '@/stores/meta'

const auth = useAuthStore()
const metaStore = useMetaStore()
const route = useRoute()
const router = useRouter()
const message = useMessage()
const { isActive } = useNavItems()

const userMenu = computed<DropdownOption[]>(() => [
  { key: 'profile', label: 'Moj profil' },
  { key: 'info', label: 'Info i kontakt' },
  ...(auth.isAdmin ? [{ key: 'admin', label: 'Administracija' }] : []),
  { type: 'divider', key: 'd' },
  { key: 'logout', label: 'Odjava' },
])

async function onUserMenu(key: string) {
  if (key === 'logout') {
    await auth.logout()
    metaStore.reset()
    message.success('Odjavljeni ste')
    if (route.matched.some((r) => r.meta.requiresAuth)) router.push({ name: 'races' })
    return
  }
  router.push({ name: key })
}

const loginTarget = computed(() => ({
  name: 'login',
  query: route.name === 'login' || route.name === 'signup' ? route.query : { redirect: route.fullPath },
}))
</script>

<template>
  <NLayout class="page">
    <NLayoutHeader class="header">
      <div class="container header-inner">
        <RouterLink :to="{ name: 'races' }" class="brand" aria-label="Stoperica.live – početna">
          <BrandLogo :height="34" tone="dark" />
        </RouterLink>
        <nav class="nav" aria-label="Glavna navigacija">
          <RouterLink
            v-for="item in SECTIONS"
            :key="item.key"
            :to="item.to"
            class="nav-link"
            :class="{ active: isActive(item) }"
            :aria-current="isActive(item) ? 'page' : undefined"
          >
            <svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path :d="item.icon" /></svg>
            {{ item.label }}
          </RouterLink>
        </nav>
        <NFlex align="center" :size="4" :wrap="false" class="actions">
          <ThemeToggle />
          <template v-if="auth.user">
            <NDropdown trigger="click" placement="bottom-end" :options="userMenu" @select="onUserMenu">
              <NButton quaternary class="user-button">
                <svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path :d="ICONS.profile" /></svg>
                <span class="user-name">{{ auth.displayName }}</span>
                <svg viewBox="0 0 24 24" class="icon chevron" aria-hidden="true"><path :d="ICONS.chevronDown" /></svg>
              </NButton>
            </NDropdown>
          </template>
          <template v-else>
            <NButton quaternary size="small" @click="router.push(loginTarget)">Prijava</NButton>
            <NButton size="small" class="cta" @click="router.push({ name: 'signup', query: loginTarget.query })">
              Registracija
            </NButton>
          </template>
        </NFlex>
      </div>
    </NLayoutHeader>

    <NLayoutContent class="content">
      <div class="container">
        <RouterView />
      </div>
    </NLayoutContent>

    <MobileTabBar />
  </NLayout>
</template>

<style scoped>
.page {
  min-height: 100vh;
}
.container {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 12px;
}
.header {
  --ink: #1a0d00;
  position: sticky;
  top: 0;
  z-index: 10;
  color: var(--ink);
  background: linear-gradient(100deg, var(--gold-1) 0%, var(--gold) 55%, var(--gold-2) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.5),
    inset 0 -1px 0 rgba(0, 0, 0, 0.12),
    0 6px 20px -10px rgba(255, 138, 31, 0.8);
}
.header::before {
  content: '';
  position: absolute;
  inset: 0 0 0 auto;
  width: min(160px, 22%);
  background: conic-gradient(var(--ink) 25%, transparent 0 50%, var(--ink) 0 75%, transparent 0) 0 0 / 14px 14px;
  opacity: 0.13;
  -webkit-mask-image: linear-gradient(to right, transparent, #000 85%);
  mask-image: linear-gradient(to right, transparent, #000 85%);
  pointer-events: none;
}
.header::after {
  content: '';
  position: absolute;
  inset: auto 0 0 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--aqua) 20%, var(--aqua-deep) 80%, transparent);
  pointer-events: none;
}
.header-inner {
  position: relative;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.brand {
  display: flex;
  flex-shrink: 1;
  min-width: 0;
  margin-right: auto;
}
.brand :deep(img) {
  max-width: 100%;
  height: auto;
  max-height: 34px;
}
.nav {
  display: none;
  gap: 2px;
  margin-right: 8px;
}
.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  color: var(--ink);
  font-weight: 600;
  text-decoration: none;
  opacity: 0.82;
  transition:
    background-color 0.15s,
    opacity 0.15s;
}
.nav-link:hover {
  opacity: 1;
  background: rgba(26, 13, 0, 0.1);
}
.nav-link.active {
  opacity: 1;
  color: var(--gold-1);
  background: var(--ink);
  box-shadow: 0 2px 8px -2px rgba(26, 13, 0, 0.5);
}
.icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  fill: currentColor;
}
.chevron {
  width: 16px;
  height: 16px;
  margin-left: 2px;
}
.actions :deep(.n-button:not(.cta)) {
  --n-text-color: var(--ink) !important;
  --n-text-color-hover: var(--ink) !important;
  --n-text-color-pressed: var(--ink) !important;
  --n-text-color-focus: var(--ink) !important;
  --n-color-hover: rgba(26, 13, 0, 0.1) !important;
  --n-color-pressed: rgba(26, 13, 0, 0.16) !important;
  --n-color-focus: rgba(26, 13, 0, 0.1) !important;
  font-weight: 600;
}
.actions :deep(.cta) {
  --n-color: var(--ink) !important;
  --n-color-hover: #2e1a05 !important;
  --n-color-pressed: #000 !important;
  --n-color-focus: #2e1a05 !important;
  --n-text-color: var(--gold-1) !important;
  --n-text-color-hover: var(--gold-1) !important;
  --n-text-color-pressed: var(--gold-1) !important;
  --n-text-color-focus: var(--gold-1) !important;
  --n-border: none !important;
  --n-border-hover: none !important;
  --n-border-pressed: none !important;
  --n-border-focus: none !important;
  font-weight: 700;
}
.user-button .icon:first-child {
  margin-right: 6px;
}
.user-name {
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.content {
  padding: 16px 0 calc(88px + env(safe-area-inset-bottom));
  min-height: calc(100vh - 56px);
}

@media (min-width: 768px) {
  .container {
    padding: 0 20px;
  }
  .nav {
    display: flex;
  }
  .user-name {
    max-width: 220px;
  }
  .content {
    padding: 24px 0 48px;
  }
}
</style>
