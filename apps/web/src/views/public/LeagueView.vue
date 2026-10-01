<script setup lang="ts">
import type { LeagueDetail, LeagueRace } from '@stoperica/shared'
import { NButton, NEmpty, NResult, NSkeleton, NTab, NTabs, NTag, useThemeVars } from 'naive-ui'
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/api/http'
import { publicApi } from '@/api/public'
import StandingsTable, { type StandingRowView } from '@/components/public/StandingsTable.vue'
import {
  countryFlag, countryName, formatDate, formatDateTime, hideBrokenImage, LEAGUE_TYPE_LABELS, plural, RACE_TYPE_LABELS,
  uciRacerName,
} from '@/public/format'
import { useAuthStore } from '@/stores/auth'

type Tab = 'natjecatelji' | 'klubovi' | 'kalendar'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const themeVars = useThemeVars()

const league = ref<LeagueDetail | null>(null)
const loading = ref(true)
const notFound = ref(false)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    league.value = await publicApi.league(String(route.params.slug))
    notFound.value = false
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound.value = true
    else error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}
watch(() => route.params.slug, load, { immediate: true })

const tabs = computed(() => {
  const l = league.value
  const list: { key: Tab; label: string }[] = []
  if (l?.racerStandings) list.push({ key: 'natjecatelji', label: 'Natjecatelji' })
  if (l?.clubStandings) list.push({ key: 'klubovi', label: 'Klubovi' })
  list.push({ key: 'kalendar', label: 'Kalendar' })
  return list
})
const tab = computed<Tab>(() => {
  const wanted = String(route.query.tab ?? '')
  return tabs.value.find((t) => t.key === wanted)?.key ?? tabs.value[0]!.key
})
const setTab = (key: Tab) => router.replace({ query: { ...route.query, tab: key, kategorija: undefined } })

const categories = computed(() => league.value?.racerStandings ?? [])
const category = computed(() => {
  const wanted = String(route.query.kategorija ?? '')
  const mine = auth.user ? categories.value.find((c) => c.rows.some((r) => r.racer.id === auth.user!.id)) : undefined
  return categories.value.find((c) => c.key === wanted) ?? mine ?? categories.value[0] ?? null
})
const setCategory = (key: string) => router.replace({ query: { ...route.query, kategorija: key } })

const racerRows = computed<StandingRowView[]>(() =>
  (category.value?.rows ?? []).map((row) => ({
    ...row,
    key: row.racer.id,
    title: uciRacerName(row.racer),
    subtitle: row.racer.club,
    flag: countryFlag(row.racer.country),
    flagTitle: countryName(row.racer.country),
    mine: row.racer.id === auth.user?.id,
    to: { name: 'racer', params: { id: row.racer.id } },
  })),
)
const clubRows = computed<StandingRowView[]>(() =>
  (league.value?.clubStandings ?? []).map((row) => ({ ...row, key: row.club.id, title: row.club.name ?? '—' })),
)

const typeLabel = computed(() => {
  const l = league.value
  if (!l) return null
  return l.leagueType ? LEAGUE_TYPE_LABELS[l.leagueType] : l.raceType ? RACE_TYPE_LABELS[l.raceType] : null
})

const STATUS: Record<LeagueRace['status'], { label: string; type: 'success' | 'info' | 'default' }> = {
  finished: { label: 'Završeno', type: 'default' },
  next: { label: 'Sljedeća', type: 'success' },
  upcoming: { label: 'Nadolazeća', type: 'info' },
}
const raceAction = (race: LeagueRace) =>
  race.status === 'finished' ? 'Rezultati' : race.registrationOpen ? 'Prijave' : 'Detalji'

const themeStyle = computed(() => ({
  '--primary': themeVars.value.primaryColor,
  '--muted': themeVars.value.textColor3,
  '--divider': themeVars.value.dividerColor,
  '--surface': themeVars.value.cardColor,
}))
</script>

<template>
  <NResult v-if="notFound" status="404" title="Natjecanje nije pronađeno" class="state">
    <template #footer>
      <NButton @click="router.push({ name: 'leagues' })">Sva natjecanja</NButton>
    </template>
  </NResult>
  <NResult v-else-if="error && !league" status="error" :title="error" class="state" />
  <NSkeleton v-else-if="loading && !league" height="320px" :sharp="false" />

  <div v-else-if="league" class="league" :style="themeStyle">
    <RouterLink :to="{ name: 'leagues' }" class="back">‹ Sva natjecanja</RouterLink>

    <header class="hero">
      <img v-if="league.pictureUrl" :src="league.pictureUrl" alt="" class="hero-bg" @error="hideBrokenImage" />
      <div class="hero-shade" />
      <div class="hero-content">
        <div class="tags">
          <NTag v-if="typeLabel" size="small" round :bordered="false" type="info">{{ typeLabel }}</NTag>
          <NTag v-if="league.status === 'finished'" size="small" round :bordered="false">Završeno</NTag>
        </div>
        <h1>{{ league.name }}</h1>
        <p class="hero-meta">
          {{ league.finishedCount }}
          {{ plural(league.finishedCount, 'održana utrka', 'održane utrke', 'održanih utrka') }} ·
          {{ league.racerCount }} {{ plural(league.racerCount, 'natjecatelj', 'natjecatelja', 'natjecatelja') }}
          <template v-if="league.firstDate"> · od {{ formatDate(league.firstDate) }}</template>
        </p>
        <RouterLink v-if="league.nextRace" :to="{ name: 'race', params: { id: league.nextRace.id } }" class="next">
          Sljedeća utrka: {{ league.nextRace.name }} · {{ formatDate(league.nextRace.date) }} ›
        </RouterLink>
      </div>
    </header>

    <NTabs type="segment" :value="tab" animated class="tabs" @update:value="setTab">
      <NTab v-for="t in tabs" :key="t.key" :name="t.key">{{ t.label }}</NTab>
    </NTabs>

    <section v-if="tab === 'natjecatelji'" class="panel">
      <nav v-if="categories.length > 1" class="chips" aria-label="Kategorije">
        <NButton
          v-for="c in categories"
          :key="c.key"
          size="small"
          round
          :type="category?.key === c.key ? 'primary' : 'default'"
          :secondary="category?.key !== c.key"
          @click="setCategory(c.key)"
        >
          {{ c.name }}
        </NButton>
      </nav>
      <p class="hint muted">
        {{ league.standingsMode === 'time' ? 'Poredak po ukupnom vremenu.' : 'Poredak po ukupnim bodovima.' }}
        <span class="narrow-hint">Dodirnite natjecatelja za rezultate po kolima.</span>
      </p>
      <StandingsTable
        v-if="category"
        :rows="racerRows"
        :races="league.races"
        :mode="league.standingsMode"
        name-label="Natjecatelj"
      />
    </section>

    <section v-else-if="tab === 'klubovi'" class="panel">
      <p class="hint muted">
        Poredak klubova po ukupnim bodovima.
        <span class="narrow-hint">Dodirnite klub za bodove po kolima.</span>
      </p>
      <StandingsTable :rows="clubRows" :races="league.races" mode="points" name-label="Klub" />
    </section>

    <section v-else class="panel">
      <NEmpty v-if="league.races.length === 0" description="Nema utrka" />
      <ol v-else class="calendar">
        <li v-for="race in league.races" :key="race.id" class="round" :class="race.status">
          <span class="round-badge">R{{ race.round }}</span>
          <div class="round-main">
            <RouterLink :to="{ name: 'race', params: { id: race.id } }" class="round-name">{{ race.name }}</RouterLink>
            <span class="muted round-date">{{ formatDateTime(race.date) }}</span>
          </div>
          <div class="round-side">
            <NTag size="small" round :bordered="false" :type="STATUS[race.status].type">{{ STATUS[race.status].label }}</NTag>
            <NButton
              size="small"
              :type="race.status === 'finished' ? 'info' : 'primary'"
              @click="router.push({ name: 'race', params: { id: race.id } })"
            >
              {{ raceAction(race) }}
            </NButton>
          </div>
        </li>
      </ol>
    </section>
  </div>
</template>

<style scoped>
.state {
  margin-top: 48px;
}
.league {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.muted {
  color: var(--muted);
}
.back {
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
}

.hero {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--divider);
  background:
    radial-gradient(120% 120% at 0% 0%, color-mix(in srgb, var(--aqua-deep) 45%, transparent), transparent 60%),
    radial-gradient(120% 120% at 100% 100%, color-mix(in srgb, var(--gold-2) 35%, transparent), transparent 60%),
    var(--surface);
}
.hero-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.35;
}
.hero-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.55));
}
.hero-content {
  position: relative;
  padding: 18px 16px 16px;
  color: #fff;
}
.tags {
  display: flex;
  gap: 6px;
}
.hero h1 {
  margin: 10px 0 4px;
  font-size: 24px;
  line-height: 1.2;
}
.hero-meta {
  margin: 0;
  font-size: 13px;
  opacity: 0.85;
}
.next {
  display: inline-block;
  margin-top: 12px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  color: inherit;
  text-decoration: none;
  background: rgba(255, 255, 255, 0.14);
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.chips {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: thin;
}
.chips :deep(.n-button) {
  flex-shrink: 0;
}
.hint {
  margin: 0;
  font-size: 13px;
}

.calendar {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--divider);
  border-radius: 12px;
  overflow: hidden;
  background: var(--surface);
}
.round {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  grid-template-areas: 'badge main' 'badge side';
  column-gap: 12px;
  row-gap: 8px;
  padding: 12px;
}
.round + .round {
  border-top: 1px solid var(--divider);
}
.round.next {
  background: color-mix(in srgb, var(--gold) 10%, transparent);
}
.round-badge {
  grid-area: badge;
  align-self: start;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 14px;
  background: color-mix(in srgb, var(--gold) 18%, transparent);
  color: var(--gold);
}
.round.finished .round-badge {
  background: rgba(128, 128, 128, 0.15);
  color: inherit;
}
.round-main {
  grid-area: main;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.round-name {
  font-weight: 600;
  color: inherit;
  text-decoration: none;
  line-height: 1.3;
}
.round-date {
  font-size: 13px;
}
.round-side {
  grid-area: side;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

@media (min-width: 768px) {
  .hero-content {
    padding: 32px 28px 24px;
  }
  .hero h1 {
    font-size: 32px;
  }
  .chips {
    flex-wrap: wrap;
    overflow-x: visible;
  }
  .round {
    grid-template-columns: 44px minmax(0, 1fr) auto;
    grid-template-areas: 'badge main side';
    align-items: center;
  }
  .round-side {
    justify-content: flex-end;
  }
}
@media (min-width: 900px) {
  .narrow-hint {
    display: none;
  }
}
</style>
