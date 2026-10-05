<script setup lang="ts">
import type { TimingRaceSummary } from '@stoperica/shared'
import { NButton, NEmpty, NInput, NPagination, NSpin, NTag, useMessage } from 'naive-ui'
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError } from '@/api/http'
import { timingApi } from '@/api/timing'
import { formatDateTime } from '@/public/format'

const PAGE_SIZE = 10

const router = useRouter()
const message = useMessage()
const query = ref('')
const page = ref(1)
const total = ref(0)
const races = ref<TimingRaceSummary[]>([])
const loading = ref(true)
let timer: ReturnType<typeof setTimeout> | undefined

async function load() {
  loading.value = true
  try {
    const result = await timingApi.races({ q: query.value.trim() || undefined, page: page.value })
    races.value = result.items
    total.value = result.total
    page.value = result.page
  } catch (error) {
    message.error(error instanceof ApiError ? error.message : 'Popis utrka nije učitan')
  } finally {
    loading.value = false
  }
}

function setPage(next: number) {
  if (next === page.value) return
  page.value = next
  load()
}

onMounted(load)
watch(query, () => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    page.value = 1
    load()
  }, 250)
})

function open(race: TimingRaceSummary) {
  router.push({ name: 'timing-race', params: { raceId: race.id } })
}
</script>

<template>
  <div class="page">
    <header class="head">
      <h2>Mjerenje</h2>
      <p>Sve utrke, najnovije prve.</p>
    </header>
    <NInput v-model:value="query" clearable placeholder="Naziv utrke" />
    <NSpin :show="loading">
      <NEmpty v-if="!loading && races.length === 0" description="Nema utrka" />
      <div v-else class="list">
        <button v-for="race in races" :key="race.id" type="button" class="row" @click="open(race)">
          <span class="main">
            <strong>{{ race.name ?? 'Utrka' }}</strong>
            <span class="meta">{{ formatDateTime(race.date) }} · {{ race.registeredCount }} prijavljenih</span>
          </span>
          <NTag v-if="race.endedAt" size="small" :bordered="false">Završeno</NTag>
          <NTag v-else-if="race.startedAt" size="small" type="success" :bordered="false">U tijeku</NTag>
          <NButton size="small" type="primary" tabindex="-1">Otvori</NButton>
        </button>
      </div>
      <NPagination
        v-if="total > PAGE_SIZE"
        class="pager"
        :page="page"
        :page-size="PAGE_SIZE"
        :item-count="total"
        @update:page="setPage"
      />
    </NSpin>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 760px;
}
.head h2 {
  margin: 0;
}
.head p {
  margin: 4px 0 0;
  opacity: 0.7;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  text-align: left;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(128, 128, 128, 0.35);
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.meta {
  font-size: 13px;
  opacity: 0.7;
}
.pager {
  justify-content: center;
  margin-top: 4px;
}
</style>
