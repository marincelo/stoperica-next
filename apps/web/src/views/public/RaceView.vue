<script setup lang="ts">
import type { PublicRaceDetail } from '@stoperica/shared'
import { NButton, NCard, NDescriptions, NDescriptionsItem, NEmpty, NFlex, NGrid, NGridItem, NResult, NSpin, NTag } from 'naive-ui'
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/api/http'
import { publicApi } from '@/api/public'
import CategoryResults from '@/components/public/CategoryResults.vue'
import RegistrationBox from '@/components/public/RegistrationBox.vue'
import RaceExportMenu from '@/exports/RaceExportMenu.vue'
import { formatDateTime, RACE_TYPE_LABELS } from '@/public/format'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const race = ref<PublicRaceDetail | null>(null)
const loading = ref(false)
const notFound = ref(false)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    race.value = await publicApi.race(String(route.params.id))
    notFound.value = false
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound.value = true
    else error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

watch(() => [route.params.id, auth.user?.id], load, { immediate: true })

/** `description_text` is HTML from the Rails editor; show it as plain text (as Rails did). */
const description = computed(() => {
  const html = race.value?.descriptionText
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html.replace(/<(br|\/p|\/div|\/li)\s*\/?>/gi, '$&\n'), 'text/html')
  return (doc.body.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim()
})

const started = computed(() => race.value?.startedAt !== null)
const categoriesWithRacers = computed(() => race.value?.categories.filter((c) => c.results.length > 0) ?? [])

const categoryAnchor = (id: number | null) => `kategorija-${id ?? 'ostali'}`
const scrollToCategory = (id: number | null) =>
  document.getElementById(categoryAnchor(id))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
</script>

<template>
  <NSpin :show="loading && !race">
    <NResult v-if="notFound" status="404" title="Utrka nije pronađena" style="margin-top: 48px">
      <template #footer>
        <NButton @click="router.push({ name: 'races' })">Sve utrke</NButton>
      </template>
    </NResult>
    <NResult v-else-if="error && !race" status="error" :title="error" />

    <NFlex v-else-if="race" vertical :size="24">
      <NGrid cols="1 m:3" responsive="screen" :x-gap="24" :y-gap="16">
        <NGridItem span="1 m:2">
          <NCard :bordered="false" content-style="padding: 0">
            <img v-if="race.pictureUrl" :src="race.pictureUrl" :alt="race.name ?? ''" class="hero" />
            <NFlex vertical :size="12" style="padding: 16px">
              <NFlex :size="6">
                <NTag v-if="race.raceType" :bordered="false">{{ RACE_TYPE_LABELS[race.raceType] }}</NTag>
                <RouterLink
                  v-if="race.league?.slug"
                  :to="{ name: 'league', params: { slug: race.league.slug } }"
                  class="tag-link"
                >
                  <NTag :bordered="false" type="info">🏆 {{ race.league.name }} ›</NTag>
                </RouterLink>
                <NTag v-else-if="race.league" :bordered="false" type="info">{{ race.league.name }}</NTag>
              </NFlex>
              <h1 class="title">{{ race.name }}</h1>
              <NDescriptions :column="1" label-placement="left" size="small">
                <NDescriptionsItem label="Datum">{{ formatDateTime(race.date) }}</NDescriptionsItem>
                <NDescriptionsItem label="Rok prijave">{{ formatDateTime(race.registrationThreshold) }}</NDescriptionsItem>
                <NDescriptionsItem v-if="race.startedAt" label="Start">{{ formatDateTime(race.startedAt) }}</NDescriptionsItem>
                <NDescriptionsItem label="Prijavljenih">{{ race.registeredCount }}</NDescriptionsItem>
              </NDescriptions>
              <NFlex :size="8">
                <NButton v-if="race.descriptionUrl" tag="a" :href="race.descriptionUrl" target="_blank" rel="noopener noreferrer" type="info">
                  Propozicije
                </NButton>
                <NButton v-if="race.locationUrl" tag="a" :href="race.locationUrl" target="_blank" rel="noopener noreferrer" type="info">
                  Lokacija
                </NButton>
                <RaceExportMenu v-if="auth.isAdmin" :race-id="race.id" />
              </NFlex>
              <p v-if="description" class="description">{{ description }}</p>
            </NFlex>
          </NCard>
        </NGridItem>
        <NGridItem>
          <RegistrationBox :race="race" @changed="load" />
        </NGridItem>
      </NGrid>

      <section>
        <h2 class="section-title">{{ started ? 'Rezultati' : 'Prijavljeni natjecatelji' }}</h2>
        <NEmpty v-if="categoriesWithRacers.length === 0" description="Još nema prijavljenih natjecatelja" />
        <template v-else>
          <nav v-if="categoriesWithRacers.length > 1" class="category-nav" aria-label="Kategorije">
            <NButton
              v-for="category in categoriesWithRacers"
              :key="category.id ?? 'none'"
              size="small"
              round
              secondary
              @click="scrollToCategory(category.id)"
            >
              {{ category.name }}
            </NButton>
          </nav>
          <NFlex vertical :size="16">
            <CategoryResults
              v-for="category in categoriesWithRacers"
              :id="categoryAnchor(category.id)"
              :key="category.id ?? 'none'"
              class="category-anchor"
              :category="category"
              :race-type="race.raceType"
              :started="started"
              :uci-display="race.uciDisplay"
              :my-racer-id="auth.user?.id ?? null"
            />
          </NFlex>
        </template>
      </section>
    </NFlex>
  </NSpin>
</template>

<style scoped>
.hero {
  width: 100%;
  max-height: 420px;
  object-fit: cover;
  border-radius: 6px;
}
.title {
  margin: 0;
  font-size: 22px;
  line-height: 1.25;
}
.section-title {
  margin: 0 0 12px;
  font-size: 20px;
}
.tag-link {
  text-decoration: none;
}
.tag-link :deep(.n-tag) {
  cursor: pointer;
}
.category-nav {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 10px;
  margin-bottom: 6px;
  scrollbar-width: thin;
}
.category-anchor {
  scroll-margin-top: 68px;
}

@media (min-width: 768px) {
  .title {
    font-size: 28px;
  }
  .category-nav {
    flex-wrap: wrap;
    overflow-x: visible;
  }
}
.description {
  white-space: pre-line;
  line-height: 1.6;
  margin: 0;
}
</style>
