<script setup lang="ts">
import type { PublicClubProfile } from '@stoperica/shared'
import { NButton, NEmpty, NResult, NSkeleton, useThemeVars } from 'naive-ui'
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/api/http'
import { publicApi } from '@/api/public'
import { countryFlag, countryName, plural } from '@/public/format'

const route = useRoute()
const router = useRouter()
const themeVars = useThemeVars()

const club = ref<PublicClubProfile | null>(null)
const loading = ref(true)
const notFound = ref(false)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    club.value = await publicApi.club(String(route.params.id))
    notFound.value = false
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound.value = true
    else error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}
watch(() => route.params.id, load, { immediate: true })

const membersWord = computed(() => {
  const n = club.value?.members.length ?? 0
  return `${n} ${plural(n, 'član', 'člana', 'članova')}`
})

const themeStyle = computed(() => ({
  '--primary': themeVars.value.primaryColor,
  '--muted': themeVars.value.textColor3,
  '--divider': themeVars.value.dividerColor,
  '--surface': themeVars.value.cardColor,
}))
</script>

<template>
  <NResult v-if="notFound" status="404" title="Klub nije pronađen" class="state">
    <template #footer>
      <NButton @click="router.push({ name: 'races' })">Na početnu</NButton>
    </template>
  </NResult>
  <NResult v-else-if="error && !club" status="error" :title="error" class="state" />
  <NSkeleton v-else-if="loading && !club" height="240px" :sharp="false" />

  <div v-else-if="club" class="club" :style="themeStyle">
    <header class="hero">
      <h1>{{ club.name ?? 'Klub' }}</h1>
      <p class="meta">{{ membersWord }}</p>
    </header>

    <section>
      <h2>Članovi</h2>
      <NEmpty v-if="club.members.length === 0" description="Nema članova" />
      <div v-else class="table">
        <RouterLink
          v-for="member in club.members"
          :key="member.id"
          :to="{ name: 'racer', params: { id: member.id } }"
          class="row"
        >
          <span v-if="countryFlag(member.country)" class="flag" :title="countryName(member.country)">
            {{ countryFlag(member.country) }}
          </span>
          <span class="names">
            <b class="last">{{ member.lastName?.toLocaleUpperCase('hr-HR') ?? '' }}</b>
            {{ member.firstName ?? '' }}
          </span>
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.state {
  margin-top: 48px;
}
.club {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.hero {
  padding: 6px 0 2px;
}
h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  line-height: 1.2;
}
.meta {
  margin: 10px 0 0;
  font-size: 15px;
  color: var(--muted);
}
h2 {
  margin: 0 0 10px;
  font-size: 18px;
}
.table {
  border: 1px solid var(--divider);
  border-radius: 12px;
  overflow: hidden;
  background: var(--surface);
}
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  color: inherit;
  text-decoration: none;
}
.row + .row {
  border-top: 1px solid var(--divider);
}
.row:hover {
  color: var(--primary);
}
.flag {
  font-size: 22px;
  line-height: 1;
}
.names {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.last {
  font-weight: 800;
  letter-spacing: 0.02em;
}
@media (min-width: 720px) {
  h1 {
    font-size: 32px;
  }
}
</style>
