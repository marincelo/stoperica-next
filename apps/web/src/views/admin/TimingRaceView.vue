<script setup lang="ts">
import type { RaceStartNumberOption, TimingRace, TimingResult } from '@stoperica/shared'
import {
  NButton,
  NEmpty,
  NInput,
  NPopconfirm,
  NSelect,
  NSpin,
  useMessage,
} from 'naive-ui'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { crudApi } from '@/api/crud'
import { ApiError } from '@/api/http'
import { timingApi, type TimingRacerHit } from '@/api/timing'
import LapTimesEditor from '@/components/admin/LapTimesEditor.vue'
import BibAssign from '@/components/public/BibAssign.vue'
import { countryFlag, countryName, formatDateTime, formatElapsed, statusLabel } from '@/public/format'

const STATUSES = [1, 2, 3, 4, 5, 6]

const route = useRoute()
const router = useRouter()
const message = useMessage()

const race = ref<TimingRace | null>(null)
const startNumbers = ref<RaceStartNumberOption[]>([])
const loading = ref(true)
const refreshing = ref(false)
const notFound = ref(false)
const query = ref('')
const now = ref(Date.now())
const savingId = ref<number | null>(null)
const selectedIds = ref<number[]>([])
const starting = ref(false)
const racerQuery = ref('')
const racerHits = ref<TimingRacerHit[]>([])
const pickedRacer = ref<TimingRacerHit | null>(null)
const registerCategoryId = ref<number | null>(null)
const searching = ref(false)
const registering = ref(false)

let clockTimer: ReturnType<typeof setInterval> | undefined
let searchTimer: ReturnType<typeof setTimeout> | undefined

const raceId = computed(() => Number(route.params.raceId))

async function load() {
  const id = raceId.value
  if (!Number.isInteger(id) || id < 1) {
    notFound.value = true
    loading.value = false
    return
  }
  if (!race.value) loading.value = true
  else refreshing.value = true
  try {
    const [board, numbers] = await Promise.all([timingApi.race(id), crudApi.raceStartNumbers(id)])
    race.value = board
    startNumbers.value = numbers
    selectedIds.value = selectedIds.value.filter((id) => {
      const category = board.categories.find((item) => item.id === id)
      return category !== undefined && !categoryStarted(category)
    })
    notFound.value = false
    if (registerCategoryId.value === null) registerCategoryId.value = board.categories[0]?.id ?? null
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound.value = true
    else message.error(error instanceof ApiError ? error.message : 'Utrka nije učitana')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

watch(raceId, () => {
  race.value = null
  selectedIds.value = []
  query.value = ''
  load()
})
onMounted(() => {
  load()
  clockTimer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onUnmounted(() => {
  clearInterval(clockTimer)
  clearTimeout(searchTimer)
})

const clock = computed(() => (race.value?.startedAt ? formatElapsed(race.value.startedAt, now.value) : ''))

const counts = computed(() => {
  const c = race.value?.counts
  if (!c) return []
  return [
    { label: 'Ukupno', value: c.total },
    { label: 'Prijavljeni', value: c.registered },
    { label: 'Na startu', value: c.atStart },
    { label: 'Završili', value: c.finished },
    { label: 'DNF', value: c.dnf },
    { label: 'DSQ', value: c.dsq },
    { label: 'DNS', value: c.dns },
    { label: 'Bez broja', value: c.missingBib },
  ]
})

function bibOf(result: TimingResult) {
  return startNumbers.value.find((number) => number.id === result.startNumberId)?.value ?? ''
}

function nameOf(result: TimingResult) {
  const racer = result.racer
  if (!racer) return '—'
  const last = racer.lastName?.toLocaleUpperCase('hr-HR') ?? ''
  return [last, racer.firstName].filter(Boolean).join(' ') || '—'
}

function lastLapTime(result: TimingResult) {
  const time = result.laps.at(-1)?.time
  return time !== undefined && time > 0 ? time : undefined
}

function compareResults(a: TimingResult, b: TimingResult) {
  const laps = b.laps.length - a.laps.length
  if (laps) return laps
  const left = lastLapTime(a)
  const right = lastLapTime(b)
  if (left !== right) {
    if (left === undefined) return 1
    if (right === undefined) return -1
    return left - right
  }
  const bibLeft = bibOf(a)
  const bibRight = bibOf(b)
  if (!bibLeft !== !bibRight) return bibLeft ? -1 : 1
  const bib = bibLeft.localeCompare(bibRight, 'hr', { numeric: true })
  if (bib) return bib
  return nameOf(a).localeCompare(nameOf(b), 'hr')
}

function categoryStarted(category: { startedAt: string | null; mixedStart: boolean }) {
  return category.startedAt !== null || category.mixedStart
}

const filteredResults = computed(() => {
  const rows = race.value?.results ?? []
  const needle = query.value.trim().toLocaleLowerCase('hr-HR')
  return rows
    .filter((row) => {
      if (!needle) return true
      const hay = [bibOf(row), nameOf(row), row.racer?.club, row.racer?.country].filter(Boolean).join(' ')
      return hay.toLocaleLowerCase('hr-HR').includes(needle)
    })
    .slice()
    .sort(compareResults)
})

const groups = computed(() => {
  const categories = race.value?.categories ?? []
  const known = new Set(categories.map((category) => category.id))
  const rows = filteredResults.value
  const grouped = categories.map((category) => ({
    category,
    rows: rows.filter((row) => row.categoryId === category.id),
  }))
  const orphans = rows.filter((row) => row.categoryId === null || !known.has(row.categoryId))
  if (orphans.length) {
    grouped.push({
      category: { id: 0, name: 'Bez kategorije', startedAt: null, mixedStart: false, count: orphans.length },
      rows: orphans,
    })
  }
  if (query.value.trim()) return grouped.filter((group) => group.rows.length > 0)
  return grouped.filter((group) => group.category.id !== 0 || group.rows.length > 0)
})

function statusOptions(result: TimingResult) {
  return STATUSES.map((status) => ({
    value: status,
    label: statusLabel({ status, racer: { gender: result.racer?.gender ?? null } }),
  }))
}

const categoryOptions = computed(() =>
  (race.value?.categories ?? []).map((category) => ({
    value: category.id,
    label: category.name ?? `Kategorija ${category.id}`,
  })),
)

async function run(resultId: number, action: () => Promise<unknown>, failure: string) {
  savingId.value = resultId
  try {
    await action()
    await load()
  } catch (error) {
    message.error(error instanceof ApiError ? error.message : failure)
  } finally {
    savingId.value = null
  }
}

function assignBib(result: TimingResult, startNumberId: number | null) {
  return run(result.id, () => crudApi.assignStartNumber(raceId.value, result.id, startNumberId), 'Broj nije spremljen')
}

function setStatus(result: TimingResult, status: number | null) {
  if (status === null || status === result.status) return
  return run(result.id, () => timingApi.updateResult(raceId.value, result.id, { status }), 'Status nije spremljen')
}

function saveLaps(result: TimingResult, laps: { time: number; readerId: string }[]) {
  return run(result.id, () => timingApi.updateResult(raceId.value, result.id, { laps }), 'Krugovi nisu spremljeni')
}

function toggleCategory(id: number) {
  const category = race.value?.categories.find((item) => item.id === id)
  if (!category || categoryStarted(category)) return
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((item) => item !== id)
    : [...selectedIds.value, id]
}

async function startSelected() {
  const ids = selectedIds.value.filter((id) => {
    const category = race.value?.categories.find((item) => item.id === id)
    return category !== undefined && !categoryStarted(category)
  })
  if (!ids.length) return
  starting.value = true
  try {
    let updated = 0
    for (const id of ids) {
      const result = await timingApi.startCategory(raceId.value, id)
      updated += result.updated
    }
    if (!updated) message.warning('Nema prijavljenih u odabranim kategorijama')
    else message.success(`Start postavljen za ${updated}`)
    selectedIds.value = []
    await load()
  } catch (error) {
    message.error(error instanceof ApiError ? error.message : 'Start nije postavljen')
    await load()
  } finally {
    starting.value = false
  }
}

watch(racerQuery, (value) => {
  clearTimeout(searchTimer)
  pickedRacer.value = null
  const q = value.trim()
  if (q.length < 2) {
    racerHits.value = []
    return
  }
  searchTimer = setTimeout(async () => {
    searching.value = true
    try {
      racerHits.value = await timingApi.racers(q)
    } catch (error) {
      message.error(error instanceof ApiError ? error.message : 'Pretraga nije uspjela')
    } finally {
      searching.value = false
    }
  }, 250)
})

async function register() {
  if (!pickedRacer.value || registerCategoryId.value === null) return
  registering.value = true
  try {
    await timingApi.register(raceId.value, {
      racerId: pickedRacer.value.id,
      categoryId: registerCategoryId.value,
    })
    message.success('Natjecatelj je prijavljen')
    racerQuery.value = ''
    racerHits.value = []
    pickedRacer.value = null
    await load()
  } catch (error) {
    message.error(error instanceof ApiError ? error.message : 'Prijava nije spremljena')
  } finally {
    registering.value = false
  }
}

function unregister(result: TimingResult) {
  return run(result.id, () => timingApi.unregister(raceId.value, result.id), 'Odjava nije uspjela')
}

function hitLabel(hit: TimingRacerHit) {
  const name = [hit.lastName?.toLocaleUpperCase('hr-HR'), hit.firstName].filter(Boolean).join(' ')
  return [name, hit.club, hit.country].filter(Boolean).join(' · ')
}
</script>

<template>
  <NSpin :show="loading && !race">
    <div v-if="notFound" class="missing">
      <p>Utrka nije pronađena.</p>
      <NButton @click="router.push({ name: 'timing' })">Sve utrke</NButton>
    </div>

    <div v-else-if="race" class="desk">
      <header class="head">
        <div>
          <RouterLink :to="{ name: 'timing' }" class="back">‹ Sve utrke</RouterLink>
          <h2>{{ race.name ?? 'Utrka' }}</h2>
          <p class="meta">
            {{ formatDateTime(race.date) }}
            <template v-if="race.endedAt"> · završeno {{ formatDateTime(race.endedAt) }}</template>
            <template v-else-if="clock"> · {{ clock }}</template>
            <template v-else> · utrka nije startana</template>
            <RouterLink class="public" :to="{ name: 'race', params: { id: race.id } }">Javna stranica</RouterLink>
          </p>
        </div>
        <NButton :loading="refreshing" @click="load">Osvježi</NButton>
      </header>

      <div class="panels">
        <section class="panel">
          <h3>Pregled</h3>
          <div class="counts">
            <span v-for="item in counts" :key="item.label" class="count">
              <b>{{ item.value }}</b> {{ item.label }}
            </span>
          </div>
        </section>

        <section class="panel">
          <h3>Prijava</h3>
          <div class="register-box">
            <NInput v-model:value="racerQuery" clearable placeholder="Ime, prezime ili ID" />
            <p v-if="searching" class="sub">Tražim…</p>
            <div v-if="racerHits.length" class="hits">
              <button
                v-for="hit in racerHits"
                :key="hit.id"
                type="button"
                class="hit"
                :class="{ picked: pickedRacer?.id === hit.id }"
                @click="pickedRacer = hit"
              >
                {{ hitLabel(hit) }}
              </button>
            </div>
            <NSelect v-model:value="registerCategoryId" :options="categoryOptions" placeholder="Kategorija" />
            <NButton
              type="primary"
              :disabled="!pickedRacer || registerCategoryId === null"
              :loading="registering"
              @click="register"
            >
              Prijavi
            </NButton>
          </div>
        </section>

        <section class="panel start-panel">
          <div class="start-head">
            <h3>Start</h3>
            <NButton type="primary" size="small" :disabled="selectedIds.length === 0" :loading="starting" @click="startSelected">
              Start
            </NButton>
          </div>
          <div class="picks">
            <button
              v-for="category in race.categories"
              :key="category.id"
              type="button"
              class="pick"
              :class="{ on: selectedIds.includes(category.id) }"
              :disabled="categoryStarted(category) || starting"
              :aria-pressed="selectedIds.includes(category.id)"
              @click="toggleCategory(category.id)"
            >
              <span>{{ category.name ?? 'Kategorija' }} ({{ category.count }})</span>
              <span v-if="category.startedAt" class="pick-meta">{{ formatDateTime(category.startedAt) }}</span>
              <span v-else-if="category.mixedStart" class="pick-meta">različit start</span>
            </button>
          </div>
        </section>
      </div>

      <NInput v-model:value="query" clearable placeholder="Broj, ime ili klub" />

      <NEmpty v-if="groups.length === 0" description="Nema natjecatelja" />
      <section v-for="group in groups" :key="group.category.id" class="group">
        <h3 class="group-title">
          {{ group.category.name ?? 'Kategorija' }}
          <span class="sub">{{ group.rows.length }}</span>
          <span v-if="group.category.startedAt" class="sub"> · {{ formatDateTime(group.category.startedAt) }}</span>
          <span v-else-if="group.category.mixedStart" class="sub"> · različit start</span>
        </h3>
        <p v-if="group.rows.length === 0" class="sub">Nema natjecatelja</p>
        <div v-else class="scroller">
          <table>
            <thead>
              <tr>
                <th>Broj</th>
                <th>Natjecatelj</th>
                <th>Status</th>
                <th>Start</th>
                <th>Krugovi</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="result in group.rows" :key="result.id">
                <td class="bib">
                  <BibAssign
                    :model-value="result.startNumberId"
                    :options="startNumbers"
                    :loading="savingId === result.id"
                    @update="assignBib(result, $event)"
                  />
                </td>
                <td class="who">
                  <div class="name">
                    <span v-if="countryFlag(result.racer?.country ?? null)" class="flag" :title="countryName(result.racer?.country ?? null)">
                      {{ countryFlag(result.racer?.country ?? null) }}
                    </span>
                    {{ nameOf(result) }}
                  </div>
                  <div class="sub">{{ result.racer?.club ?? 'Bez kluba' }}</div>
                </td>
                <td class="status">
                  <NSelect
                    size="small"
                    :value="result.status"
                    :options="statusOptions(result)"
                    :disabled="savingId === result.id"
                    @update:value="setStatus(result, $event)"
                  />
                </td>
                <td class="when">{{ result.startedAt ? formatDateTime(result.startedAt) : '—' }}</td>
                <td>
                <LapTimesEditor
                  :laps="result.laps"
                  :start-at="result.startedAt ?? race.startedAt"
                  :saving="savingId === result.id"
                  @save="saveLaps(result, $event)"
                />
                </td>
                <td>
                  <NPopconfirm positive-text="Odjavi" negative-text="Odustani" @positive-click="unregister(result)">
                    <template #trigger>
                      <NButton size="tiny" quaternary type="error" :disabled="savingId === result.id">Odjavi</NButton>
                    </template>
                    Obrisati prijavu{{ result.laps.length || result.startNumberId ? ', broj i zabilježena vremena' : '' }}?
                  </NPopconfirm>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </NSpin>
</template>

<style scoped>
.desk {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}
.head h2 {
  margin: 2px 0 0;
}
.back,
.public {
  font-size: 13px;
}
.meta {
  margin: 4px 0 0;
  opacity: 0.75;
}
.public {
  margin-left: 8px;
}
.panels {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: stretch;
}
.panel {
  flex: 1 1 280px;
  border: 1px solid rgba(128, 128, 128, 0.28);
  border-radius: 10px;
  padding: 12px;
}
.panel h3,
.group-title {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.start-panel {
  flex-basis: 100%;
}
.start-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.start-head h3 {
  margin: 0;
}
.counts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.count {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(128, 128, 128, 0.15);
  font-size: 13px;
}
.picks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.pick {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(128, 128, 128, 0.4);
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}
.pick.on {
  border-color: #18a058;
  background: rgba(24, 160, 88, 0.12);
}
.pick:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.pick-meta {
  font-size: 11px;
  opacity: 0.75;
}
.register-box {
  display: grid;
  gap: 8px;
}
.group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.hits {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 180px;
  overflow: auto;
}
.hit {
  text-align: left;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid rgba(128, 128, 128, 0.35);
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.hit.picked {
  border-color: var(--n-primary-color, #18a058);
}
.scroller {
  overflow: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  min-width: 860px;
}
th,
td {
  padding: 8px 6px;
  border-bottom: 1px solid rgba(128, 128, 128, 0.25);
  vertical-align: top;
  text-align: left;
}
th {
  font-size: 12px;
  font-weight: 650;
  opacity: 0.7;
}
.bib {
  width: 160px;
}
.status {
  width: 150px;
}
.when {
  white-space: nowrap;
  font-size: 13px;
}
.name {
  font-weight: 700;
}
.sub {
  font-size: 12px;
  opacity: 0.7;
}
.flag {
  margin-right: 4px;
}
.missing {
  margin-top: 24px;
}
</style>
