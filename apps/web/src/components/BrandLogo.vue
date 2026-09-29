<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'

const props = defineProps<{ height?: number; tone?: 'auto' | 'dark' }>()
const theme = useThemeStore()
const src = computed(() => (props.tone !== 'dark' && theme.isDark ? '/logo-light.png' : '/logo.png'))
</script>

<template>
  <img :src="src" alt="Stoperica.live" :height="height ?? 32" class="brand-logo" />
</template>

<style scoped>
.brand-logo {
  display: block;
  width: auto;
}
</style>
