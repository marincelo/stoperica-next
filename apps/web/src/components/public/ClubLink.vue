<script setup lang="ts">
defineProps<{
  name: string | null | undefined
  clubId?: number | null
  fallback?: string
}>()
</script>

<template>
  <RouterLink v-if="clubId" :to="{ name: 'club', params: { id: clubId } }" class="club-link">{{ name }}</RouterLink>
  <span v-else>{{ name || fallback || '' }}</span>
</template>

<style scoped>
.club-link {
  color: inherit;
  text-decoration: none;
}
.club-link:hover {
  color: var(--primary);
}
</style>
