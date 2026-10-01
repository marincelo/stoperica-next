<script setup lang="ts">
import type { LiveRace, LiveResult } from '@stoperica/shared'
import { NFlex, NSpin, NSwitch, useThemeVars } from 'naive-ui'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { publicApi } from '@/api/public'
import { formatElapsed, racerName, statusLabel, uciRacerName } from '@/public/format'

const POLL_MS = 20_000
const OUT = new Set([4, 5, 6])
const NO_TIME = '- -'

const themeVars = useThemeVars()
const race = ref<LiveRace | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const byCategory = ref(false)
const largeView = ref(false)
const newestFirst = ref(false)
const now = ref(Date.now())

let pollTimer: ReturnType<typeof setInterval> | undefined
let clockTimer: ReturnType<typeof setInterval> | undefined

async function load() {
  try {
    race.value = await publicApi.live()
    error.value = null
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  load()
  pollTimer = setInterval(load, POLL_MS)
  clockTimer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onUnmounted(() => {
  clearInterval(pollTimer)
  clearInterval(clockTimer)
})

const results = computed(() => race.value?.results ?? [])
const timed = computed(() =>
  results.value
    .filter((r) => r.status === 3 && r.liveTime.time !== NO_TIME)
    .sort((a, b) => compareTime(a, b, newestFirst.value)),
)
const onCourse = computed(() =>
  results.value.filter((r) => r.liveTime.time === NO_TIME && !OUT.has(r.status ?? 0)),
)
const outOfRanking = computed(() => results.value.filter((r) => OUT.has(r.status ?? 0)))
const finishedCount = computed(() => results.value.length - onCourse.value.length - outOfRanking.value.length)

const categoryOrder = computed(() => {
  const names = race.value?.categories ?? []
  const extra = timed.value.map((r) => r.category).filter((name) => !names.includes(name))
  return [...names, ...[...new Set(extra)]]
})

const timedByCategory = computed(() =>
  categoryOrder.value
    .map((name) => ({ name, rows: timed.value.filter((r) => r.category === name) }))
    .filter((group) => group.rows.length > 0),
)

function compareTime(a: LiveResult, b: LiveResult, newest: boolean) {
  if (a.liveTime.time === b.liveTime.time) return 0
  const slower = a.liveTime.time > b.liveTime.time ? 1 : -1
  return newest ? -slower : slower
}

const displayName = (r: LiveResult) => (race.value?.uciDisplay ? uciRacerName(r.racer) : racerName(r.racer))
const clock = computed(() => (race.value ? formatElapsed(race.value.startedAt, now.value) : ''))

const themeStyle = computed(() => ({
  '--divider': themeVars.value.dividerColor,
  '--muted': themeVars.value.textColor3,
  '--surface': themeVars.value.cardColor,
  '--chip': themeVars.value.actionColor,
  '--primary': themeVars.value.primaryColor,
}))
</script>

<template>
  <NSpin v-if="loading && !race" style="margin-top: 48px" />
  <p v-else-if="error && !race" class="idle">{{ error }}</p>
  <p v-else-if="!race" class="idle">Nema aktivne utrke.</p>

  <NFlex v-else vertical :size="20" :style="themeStyle" :class="{ large: largeView }">
      <header class="hero">
        <p class="kicker">Uživo</p>
        <h1 class="title">
          <RouterLink :to="{ name: 'race', params: { id: race.id } }">{{ race.name ?? 'Utrka' }}</RouterLink>
        </h1>
        <p class="clock" aria-live="polite">{{ clock }}</p>
      </header>

      <NFlex :size="16" :wrap="true" class="toggles">
        <label class="toggle"><NSwitch v-model:value="byCategory" /> Prikaz po kategorijama</label>
        <label class="toggle"><NSwitch v-model:value="largeView" /> Veliki prikaz</label>
        <label class="toggle"><NSwitch v-model:value="newestFirst" /> Najnoviji prvi</label>
      </NFlex>

      <section>
        <h2 class="section">Trenutni rezultati ({{ finishedCount }})</h2>
        <div class="scroller">
          <table class="board">
            <thead>
              <tr>
                <th>Broj</th>
                <th>Kategorija</th>
                <th>Ime</th>
                <th>Klub</th>
                <th>Vrijeme</th>
              </tr>
            </thead>
            <tbody>
              <template v-if="byCategory">
                <template v-for="group in timedByCategory" :key="group.name">
                  <tr class="cat">
                    <th colspan="5">{{ group.name.toLocaleUpperCase('hr-HR') }}</th>
                  </tr>
                  <tr v-for="r in group.rows" :key="r.id">
                    <td>{{ r.startNumber ?? '' }}</td>
                    <td>{{ r.category.toLocaleUpperCase('hr-HR') }}</td>
                    <td>
                      <RouterLink :to="{ name: 'racer', params: { id: r.racer.id } }">{{ displayName(r) }}</RouterLink>
                    </td>
                    <td>{{ r.racer.club }}</td>
                    <td class="time">{{ r.liveTime.time }} <span class="cp">{{ r.liveTime.controlPoint }}</span></td>
                  </tr>
                </template>
              </template>
              <tr v-else v-for="r in timed" :key="r.id">
                <td>{{ r.startNumber ?? '' }}</td>
                <td>{{ r.category.toLocaleUpperCase('hr-HR') }}</td>
                <td>
                  <RouterLink :to="{ name: 'racer', params: { id: r.racer.id } }">{{ displayName(r) }}</RouterLink>
                </td>
                <td>{{ r.racer.club }}</td>
                <td class="time">{{ r.liveTime.time }} <span class="cp">{{ r.liveTime.controlPoint }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 class="section">U utrci ({{ onCourse.length }})</h2>
        <div class="scroller">
          <table class="board">
            <thead>
              <tr>
                <th>Broj</th>
                <th>Kategorija</th>
                <th>Ime</th>
                <th>Klub</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in onCourse" :key="r.id">
                <td>{{ r.startNumber ?? '' }}</td>
                <td>{{ r.category.toLocaleUpperCase('hr-HR') }}</td>
                <td>
                  <RouterLink :to="{ name: 'racer', params: { id: r.racer.id } }">{{ displayName(r) }}</RouterLink>
                </td>
                <td>{{ r.racer.club }}</td>
                <td>{{ statusLabel(r) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 class="section">Van poretka ({{ outOfRanking.length }})</h2>
        <div class="scroller">
          <table class="board">
            <thead>
              <tr>
                <th>Broj</th>
                <th>Kategorija</th>
                <th>Ime</th>
                <th>Klub</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in outOfRanking" :key="r.id">
                <td>{{ r.startNumber ?? '' }}</td>
                <td>{{ r.category.toLocaleUpperCase('hr-HR') }}</td>
                <td>
                  <RouterLink :to="{ name: 'racer', params: { id: r.racer.id } }">{{ displayName(r) }}</RouterLink>
                </td>
                <td>{{ r.racer.club }}</td>
                <td>{{ statusLabel(r) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </NFlex>
</template>

<style scoped>
.idle {
  margin: 48px 0;
  text-align: center;
  font-size: 22px;
  font-weight: 700;
}
.kicker {
  margin: 0 0 4px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.title {
  margin: 0;
  font-size: 26px;
  line-height: 1.2;
}
.title a {
  color: inherit;
  text-decoration: none;
}
.title a:hover {
  text-decoration: underline;
}
.clock {
  margin: 8px 0 0;
  font-variant-numeric: tabular-nums;
  font-size: 28px;
  font-weight: 700;
}
.toggles {
  justify-content: center;
}
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.section {
  margin: 0 0 10px;
  font-size: 18px;
}
.scroller {
  overflow-x: auto;
  border: 1px solid var(--divider);
  border-radius: 10px;
  background: var(--surface);
}
.board {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}
.board th,
.board td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid var(--divider);
  white-space: nowrap;
}
.board thead th {
  font-size: 12px;
  color: var(--muted);
  font-weight: 600;
}
.board tbody tr:last-child td {
  border-bottom: none;
}
.board a {
  color: inherit;
  font-weight: 600;
  text-decoration: none;
}
.board a:hover {
  color: var(--primary);
  text-decoration: underline;
}
.cat th {
  background: var(--chip);
  font-size: 13px;
  letter-spacing: 0.04em;
}
.time {
  font-weight: 700;
}
.cp {
  font-weight: 500;
  color: var(--muted);
}
.large {
  font-size: 18px;
}
.large .clock {
  font-size: 36px;
}
.large .title {
  font-size: 32px;
}
.large .board th,
.large .board td {
  padding: 12px 16px;
}

@media (min-width: 768px) {
  .title {
    font-size: 32px;
  }
  .clock {
    font-size: 36px;
  }
}
</style>
