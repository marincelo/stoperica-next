<script setup lang="ts">
import type { TimingLap } from '@stoperica/shared'
import { NButton, NInput } from 'naive-ui'
import { computed, ref, watch } from 'vue'
import { clockToLapUnix, lapUnixToClock } from '@/public/lapClock'

const props = defineProps<{
  laps: TimingLap[]
  /** Result start when set, otherwise the race start. */
  startAt: string | null
  saving?: boolean
}>()
const emit = defineEmits<{ save: [laps: TimingLap[]] }>()

interface DraftLap {
  time: string
  readerId: string
  /** Kept when the stored instant is before the start, so an untouched row is not rewritten. */
  raw: number | null
}

const draft = ref<DraftLap[]>([])

function toDraft(lap: TimingLap, startAt: string | null): DraftLap {
  if (!startAt) return { time: '', readerId: lap.readerId, raw: lap.time }
  const elapsedMs = Math.round(lap.time * 1000) - Date.parse(startAt)
  if (elapsedMs < 0) return { time: '', readerId: lap.readerId, raw: lap.time }
  return { time: lapUnixToClock(lap.time, startAt), readerId: lap.readerId, raw: null }
}

watch(
  () => [props.laps, props.startAt] as const,
  () => {
    draft.value = props.laps.map((lap) => toDraft(lap, props.startAt))
  },
  { immediate: true },
)

function unixOf(lap: DraftLap): number | null {
  if (!lap.time.trim()) return lap.raw
  return props.startAt ? clockToLapUnix(lap.time, props.startAt) : null
}

const invalid = computed(() => !props.startAt || draft.value.some((lap) => unixOf(lap) === null))

const dirty = computed(() => {
  if (!props.startAt) return false
  if (draft.value.length !== props.laps.length) return true
  return draft.value.some((lap, index) => {
    const saved = props.laps[index]
    if (!saved || lap.readerId !== saved.readerId) return true
    const unix = unixOf(lap)
    return unix === null || Math.round(unix * 1000) !== Math.round(saved.time * 1000)
  })
})

function add() {
  draft.value = [...draft.value, { time: '', readerId: '0', raw: null }]
}

function edit(lap: DraftLap, time: string) {
  lap.time = time
  lap.raw = null
}

function remove(index: number) {
  draft.value = draft.value.filter((_, i) => i !== index)
}

function save() {
  if (!props.startAt || invalid.value) return
  const laps: TimingLap[] = []
  for (const lap of draft.value) {
    const time = unixOf(lap)
    if (time === null) return
    laps.push({ time, readerId: lap.readerId || '0' })
  }
  emit('save', laps)
}
</script>

<template>
  <div class="laps">
    <p v-if="!startAt" class="hint">Nema starta</p>
    <div v-for="(lap, index) in draft" :key="index" class="lap">
      <NInput
        :value="lap.time"
        size="small"
        placeholder="0:00:00.000"
        :disabled="saving || !startAt"
        @update:value="edit(lap, $event)"
        @keydown.enter.prevent="save"
      />
      <span v-if="lap.readerId && lap.readerId !== '0'" class="reader" :title="'Čitač ' + lap.readerId">
        {{ lap.readerId }}
      </span>
      <NButton size="tiny" quaternary :disabled="saving || !startAt" @click="remove(index)">×</NButton>
    </div>
    <div class="actions">
      <NButton size="tiny" :disabled="saving || !startAt" @click="add">Dodaj</NButton>
      <NButton v-if="dirty" size="tiny" type="primary" :loading="saving" :disabled="invalid" @click="save">
        Spremi
      </NButton>
    </div>
  </div>
</template>

<style scoped>
.laps {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 168px;
}
.lap {
  display: flex;
  align-items: center;
  gap: 4px;
}
.lap :deep(.n-input) {
  width: 9.2rem;
}
.reader,
.hint {
  font-size: 11px;
  opacity: 0.7;
}
.hint {
  margin: 0;
}
.actions {
  display: flex;
  gap: 4px;
}
</style>
