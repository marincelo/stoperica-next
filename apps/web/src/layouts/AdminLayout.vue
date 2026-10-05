<script setup lang="ts">
import type { MenuOption } from 'naive-ui'
import { NButton, NFlex, NLayout, NLayoutContent, NLayoutHeader, NLayoutSider, NMenu, NText } from 'naive-ui'
import { computed, h, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import BrandLogo from '@/components/BrandLogo.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { useAuthStore } from '@/stores/auth'
import { useMetaStore } from '@/stores/meta'

const auth = useAuthStore()
const metaStore = useMetaStore()
const route = useRoute()
const router = useRouter()
const isWide = useMediaQuery('(min-width: 768px)')
const collapsed = ref(!isWide.value)

const menuOptions = computed<MenuOption[]>(() => [
  { key: 'admin', label: () => h(RouterLink, { to: { name: 'admin' } }, () => 'Početna') },
  { key: 'timing', label: () => h(RouterLink, { to: { name: 'timing' } }, () => 'Mjerenje') },
  { type: 'divider', key: 'divider' },
  ...metaStore.models.map((model) => ({
    key: model.resource,
    label: () =>
      h(RouterLink, { to: { name: 'resource-list', params: { resource: model.resource } } }, () => model.label),
  })),
])

const activeKey = computed(() => {
  if (route.name === 'timing' || route.name === 'timing-race') return 'timing'
  return route.params.resource ? String(route.params.resource) : 'admin'
})

function onMenuSelect() {
  if (!isWide.value) collapsed.value = true
}

async function logout() {
  await auth.logout()
  metaStore.reset()
  router.push({ name: 'races' })
}
</script>

<template>
  <NLayout position="absolute">
    <NLayoutHeader bordered class="header">
      <RouterLink :to="{ name: 'admin' }" class="brand" aria-label="Stoperica admin">
        <BrandLogo :height="28" />
        <span v-if="isWide" class="brand-suffix">admin</span>
      </RouterLink>
      <NFlex align="center" :size="8" :wrap="false">
        <RouterLink :to="{ name: 'races' }" class="link">Javna stranica</RouterLink>
        <NText v-if="isWide" depth="3">{{ auth.displayName }}</NText>
        <ThemeToggle />
        <NButton size="small" @click="logout">Odjava</NButton>
      </NFlex>
    </NLayoutHeader>
    <NLayout has-sider position="absolute" style="top: 56px">
      <NLayoutSider
        v-model:collapsed="collapsed"
        bordered
        collapse-mode="width"
        :collapsed-width="0"
        :width="220"
        show-trigger="arrow-circle"
      >
        <NMenu :value="activeKey" :options="menuOptions" @update:value="onMenuSelect" />
      </NLayoutSider>
      <NLayoutContent :content-style="{ padding: isWide ? '24px' : '16px 12px' }">
        <RouterView :key="String(route.params.resource ?? '')" />
      </NLayoutContent>
    </NLayout>
  </NLayout>
</template>

<style scoped>
.header {
  height: 56px;
  padding: 0 12px 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.brand,
.link {
  color: inherit;
  text-decoration: none;
  white-space: nowrap;
}
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.brand :deep(img) {
  max-width: 100%;
  height: auto;
  max-height: 28px;
}
.brand-suffix {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.6;
}
.link {
  font-size: 14px;
  opacity: 0.8;
}
</style>
