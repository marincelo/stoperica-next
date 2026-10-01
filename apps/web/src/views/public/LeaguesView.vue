<script setup lang="ts">
import type { LeagueSummary } from '@stoperica/shared'
import { NButton, NEmpty, NSkeleton, NTag, useMessage, useThemeVars } from 'naive-ui'
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { publicApi } from '@/api/public'
import { formatDate, formatDateTime, hideBrokenImage, LEAGUE_TYPE_LABELS, plural, RACE_TYPE_LABELS } from '@/public/format'

type Filter = 'all' | 'xczld' | 'trail' | 'running' | 'other'
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Sve' },
  { key: 'xczld', label: 'XCZLD' },
  { key: 'trail', label: 'Trail' },
  { key: 'running', label: 'Trčanje' },
  { key: 'other', label: 'Ostalo' },
]

const route = useRoute()
const router = useRouter()
const message = useMessage()
const themeVars = useThemeVars()

const leagues = ref<LeagueSummary[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    leagues.value = await publicApi.leagues()
  } catch (error) {
    message.error((error as Error).message)
  } finally {
    loading.value = false
  }
})

const filter = computed<Filter>(() => {
  const value = String(route.query.vrsta ?? 'all')
  return FILTERS.some((f) => f.key === value) ? (value as Filter) : 'all'
})
const setFilter = (key: Filter) =>
  router.replace({ query: { ...route.query, vrsta: key === 'all' ? undefined : key } })

function matches(league: LeagueSummary, key: Filter) {
  if (key === 'all') return true
  if (key === 'other') return !['xczld', 'trail', 'running'].includes(league.leagueType ?? '')
  return league.leagueType === key
}

const visible = computed(() => leagues.value.filter((l) => matches(l, filter.value)))
const active = computed(() => visible.value.filter((l) => l.status === 'active'))
const byYear = computed(() => {
  const groups = new Map<string, LeagueSummary[]>()
  for (const league of visible.value) {
    if (league.status === 'active') continue
    const year = league.lastDate ? String(new Date(league.lastDate).getFullYear()) : 'Ostalo'
    groups.set(year, [...(groups.get(year) ?? []), league])
  }
  return [...groups.entries()]
})

const heldLabel = (count: number) =>
  count === 0 ? 'Još nema održanih utrka' : `${count} ${plural(count, 'održana utrka', 'održane utrke', 'održanih utrka')}`
const typeLabel = (l: LeagueSummary) =>
  l.leagueType ? LEAGUE_TYPE_LABELS[l.leagueType] : l.raceType ? RACE_TYPE_LABELS[l.raceType] : null
const leagueRoute = (l: LeagueSummary, tab?: string) => ({ name: 'league', params: { slug: l.slug }, query: tab ? { tab } : {} })
const racesWord = (n: number) => plural(n, 'utrka', 'utrke', 'utrka')

const themeStyle = computed(() => ({
  '--primary': themeVars.value.primaryColor,
  '--muted': themeVars.value.textColor3,
  '--divider': themeVars.value.dividerColor,
  '--surface': themeVars.value.cardColor,
  '--hover': themeVars.value.hoverColor,
}))
</script>

<template>
  <div class="leagues" :style="themeStyle">
    <header class="page-head">
      <h1>Natjecanja</h1>
      <p class="muted">Lige i serije utrka s ukupnim poretkom natjecatelja i klubova.</p>
    </header>

    <nav class="filters" aria-label="Vrsta natjecanja">
      <NButton
        v-for="f in FILTERS"
        :key="f.key"
        size="small"
        round
        :type="filter === f.key ? 'primary' : 'default'"
        :secondary="filter !== f.key"
        @click="setFilter(f.key)"
      >
        {{ f.label }}
      </NButton>
    </nav>

    <NSkeleton v-if="loading" height="220px" :sharp="false" />
    <NEmpty v-else-if="visible.length === 0" description="Nema natjecanja" class="empty" />

    <template v-else>
      <section v-if="active.length" class="section">
        <h2 class="section-title">U tijeku</h2>
        <div class="featured-grid">
          <article v-for="league in active" :key="league.id" class="featured">
            <RouterLink :to="leagueRoute(league)" class="featured-cover">
              <img v-if="league.pictureUrl" :src="league.pictureUrl" :alt="league.name ?? ''" loading="lazy" @error="hideBrokenImage" />
              <span class="cover-shade" />
              <span class="featured-title">
                <NTag v-if="typeLabel(league)" size="small" round :bordered="false" type="info">{{ typeLabel(league) }}</NTag>
                <strong>{{ league.name }}</strong>
              </span>
            </RouterLink>
            <div class="featured-body">
              <span class="held">{{ heldLabel(league.finishedCount) }}</span>
              <div v-if="league.nextRace" class="next">
                <span class="muted">Sljedeća utrka</span>
                <RouterLink :to="{ name: 'race', params: { id: league.nextRace.id } }" class="next-name">
                  {{ league.nextRace.name }}
                </RouterLink>
                <span class="muted">{{ formatDateTime(league.nextRace.date) }}</span>
              </div>
              <div class="actions">
                <NButton type="primary" @click="router.push(leagueRoute(league))">Poredak</NButton>
                <NButton type="info" @click="router.push(leagueRoute(league, 'kalendar'))">Kalendar</NButton>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section v-for="[year, items] in byYear" :key="year" class="section">
        <h2 class="section-title">{{ year }}</h2>
        <div class="list">
          <article v-for="league in items" :key="league.id" class="row">
            <RouterLink :to="leagueRoute(league)" class="thumb">
              <img v-if="league.pictureUrl" :src="league.pictureUrl" alt="" loading="lazy" @error="hideBrokenImage" />
              <span v-else>🏆</span>
            </RouterLink>
            <span class="row-main">
              <RouterLink :to="leagueRoute(league)" class="row-name">{{ league.name }}</RouterLink>
              <span class="muted row-meta">
                <template v-if="typeLabel(league)">{{ typeLabel(league) }} · </template>
                {{ league.raceCount }} {{ racesWord(league.raceCount) }}
                <template v-if="league.firstDate"> · {{ formatDate(league.firstDate) }} – {{ formatDate(league.lastDate) }}</template>
              </span>
              <RouterLink
                v-if="league.clubLeader"
                :to="{ name: 'club', params: { id: league.clubLeader.id } }"
                class="row-leader"
              >
                🏆 {{ league.clubLeader.name }}
              </RouterLink>
            </span>
            <RouterLink :to="leagueRoute(league)" class="chevron" tabindex="-1" aria-hidden="true">›</RouterLink>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.leagues {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.muted {
  color: var(--muted);
}
.page-head h1 {
  margin: 0;
  font-size: 24px;
}
.page-head p {
  margin: 4px 0 0;
}
.filters {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
}
.empty {
  margin: 40px 0;
}
.section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.section-title {
  margin: 8px 0 0;
  font-size: 18px;
}

.featured-grid {
  display: grid;
  gap: 14px;
}
.featured {
  border: 1px solid var(--divider);
  border-radius: 12px;
  overflow: hidden;
  background: var(--surface);
}
.featured-cover {
  position: relative;
  display: block;
  aspect-ratio: 16 / 7;
  background: color-mix(in srgb, var(--primary) 25%, transparent);
  color: #fff;
  text-decoration: none;
}
.featured-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cover-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(transparent 30%, rgba(0, 0, 0, 0.8));
}
.featured-title {
  position: absolute;
  inset: auto 14px 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}
.featured-title strong {
  font-size: 20px;
  line-height: 1.2;
}
.featured-body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.held {
  font-size: 13px;
  font-weight: 600;
}
.next {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 4px;
  font-size: 13px;
}
.next-name {
  font-size: 15px;
  font-weight: 600;
  color: inherit;
  text-decoration: none;
}
.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 6px;
}

.list {
  border: 1px solid var(--divider);
  border-radius: 12px;
  overflow: hidden;
  background: var(--surface);
}
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  color: inherit;
}
.row + .row {
  border-top: 1px solid var(--divider);
}
.row:hover {
  background: var(--hover);
}
.thumb {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  display: grid;
  place-items: center;
  font-size: 22px;
  background: rgba(128, 128, 128, 0.15);
  color: inherit;
  text-decoration: none;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.row-name {
  font-size: 15px;
  line-height: 1.3;
  font-weight: 700;
  color: inherit;
  text-decoration: none;
}
.row-name:hover {
  color: var(--primary);
}
.row-meta,
.row-leader {
  font-size: 12px;
}
.row-leader {
  color: inherit;
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row-leader:hover {
  color: var(--primary);
}
.chevron {
  font-size: 22px;
  color: var(--muted);
  text-decoration: none;
}

@media (min-width: 768px) {
  .page-head h1 {
    font-size: 30px;
  }
  .featured-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .featured-title strong {
    font-size: 22px;
  }
  .thumb {
    width: 88px;
    height: 56px;
  }
}
</style>
