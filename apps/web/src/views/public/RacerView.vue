<script setup lang="ts">
import type { PublicRacerProfile } from '@stoperica/shared'
import { NButton, NEmpty, NResult, NSkeleton, useThemeVars } from 'naive-ui'
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/api/http'
import { publicApi } from '@/api/public'
import ClubLink from '@/components/public/ClubLink.vue'
import TrophyIcon from '@/components/public/TrophyIcon.vue'
import { cleanTime, countryFlag, countryName } from '@/public/format'

const route = useRoute()
const router = useRouter()
const themeVars = useThemeVars()

const racer = ref<PublicRacerProfile | null>(null)
const loading = ref(true)
const notFound = ref(false)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    racer.value = await publicApi.racer(String(route.params.id))
    notFound.value = false
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound.value = true
    else error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}
watch(() => route.params.id, load, { immediate: true })

const flag = computed(() => countryFlag(racer.value?.country ?? null))
const lastName = computed(() => racer.value?.lastName?.toLocaleUpperCase('hr-HR') ?? '')
const firstName = computed(() => racer.value?.firstName ?? '')

const medal = (position: number | null, status: number | null) =>
  status === 3 && position !== null && position >= 1 && position <= 3 ? (position as 1 | 2 | 3) : null

const themeStyle = computed(() => ({
  '--primary': themeVars.value.primaryColor,
  '--muted': themeVars.value.textColor3,
  '--divider': themeVars.value.dividerColor,
  '--surface': themeVars.value.cardColor,
}))
</script>

<template>
  <NResult v-if="notFound" status="404" title="Natjecatelj nije pronađen" class="state">
    <template #footer>
      <NButton @click="router.push({ name: 'races' })">Na početnu</NButton>
    </template>
  </NResult>
  <NResult v-else-if="error && !racer" status="error" :title="error" class="state" />
  <NSkeleton v-else-if="loading && !racer" height="240px" :sharp="false" />

  <div v-else-if="racer" class="racer" :style="themeStyle">
    <header class="hero">
      <h1>
        <span v-if="flag" class="flag" :title="countryName(racer.country)">{{ flag }}</span>
        <span class="names">
          <b class="last">{{ lastName }}</b>
          {{ firstName }}
        </span>
      </h1>
      <p class="club">
        <b>Klub:</b>
        <ClubLink :name="racer.club" :club-id="racer.clubId" fallback="Nema" />
      </p>
    </header>

    <section class="results">
      <h2>Utrke</h2>
      <NEmpty v-if="racer.results.length === 0" description="Nema utrka" />
      <div v-else class="table">
        <div class="row head" aria-hidden="true">
          <span>Utrka</span>
          <span>Kategorija</span>
          <span>Mjesto</span>
          <span class="end">Vrijeme</span>
        </div>
        <article v-for="row in racer.results" :key="row.id" class="row">
          <RouterLink :to="{ name: 'race', params: { id: row.race.id } }" class="race-name">
            {{ row.race.name ?? '—' }}
          </RouterLink>
          <span class="category">{{ row.categoryName ?? '' }}</span>
          <span class="place">
            <span v-if="row.position != null">{{ row.position }}</span>
            <TrophyIcon v-if="medal(row.position, row.status)" :place="medal(row.position, row.status)!" />
          </span>
          <span class="time">{{ row.status === 3 ? cleanTime(row.finishTime) : '' }}</span>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.state {
  margin-top: 48px;
}
.racer {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.hero {
  padding: 6px 0 2px;
}
h1 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 26px;
  font-weight: 500;
  line-height: 1.2;
}
.flag {
  font-size: 32px;
  line-height: 1;
}
.names {
  min-width: 0;
}
.last {
  font-weight: 800;
  letter-spacing: 0.02em;
}
.club {
  margin: 10px 0 0;
  font-size: 15px;
  color: var(--muted);
}
.club b {
  color: inherit;
  font-weight: 700;
  margin-right: 6px;
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
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas: 'race place' 'cat time';
  column-gap: 12px;
  row-gap: 2px;
  align-items: center;
  padding: 12px 14px;
  font-variant-numeric: tabular-nums;
}
.row + .row {
  border-top: 1px solid var(--divider);
}
.row.head {
  display: none;
}
.race-name {
  grid-area: race;
  font-weight: 700;
  color: inherit;
  text-decoration: none;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.race-name:hover {
  color: var(--primary);
}
.category {
  grid-area: cat;
  font-size: 13px;
  color: var(--muted);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.place {
  grid-area: place;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  font-weight: 700;
}
.time {
  grid-area: time;
  text-align: right;
  font-weight: 600;
  font-size: 14px;
}
@media (min-width: 720px) {
  h1 {
    font-size: 32px;
  }
  .row,
  .row.head {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1.4fr) 88px 96px;
    grid-template-areas: none;
    column-gap: 16px;
  }
  .row.head {
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--muted);
    border-top: 0;
  }
  .row.head .end {
    text-align: right;
  }
  .race-name,
  .category,
  .place,
  .time {
    grid-area: auto;
  }
  .category {
    font-size: 14px;
    color: inherit;
  }
  .place {
    justify-content: flex-start;
  }
  .time {
    font-size: 14px;
  }
}
</style>
