<script setup lang="ts">
import { NButton } from 'naive-ui'
import { ICONS } from '@/composables/useNavItems'
import { useThemeStore } from '@/stores/theme'

const theme = useThemeStore()
</script>

<template>
  <NButton
    quaternary
    circle
    :title="theme.isDark ? 'Svijetla tema' : 'Tamna tema'"
    :aria-label="theme.isDark ? 'Svijetla tema' : 'Tamna tema'"
    @click="theme.toggle"
  >
    <svg viewBox="0 0 24 24" class="icon" aria-hidden="true"><path :d="theme.isDark ? ICONS.sun : ICONS.moon" /></svg>
  </NButton>
</template>

<style scoped>
.icon {
  width: 20px;
  height: 20px;
  fill: currentColor;
}
</style>
