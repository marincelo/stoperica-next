<script setup lang="ts">
import type { TimingLap } from '@stoperica/shared'
import { NButton, NInput } from 'naive-ui'
import { computed, ref, watch } from 'vue'

const props = defineProps<{ laps: TimingLap[]; saving?: boolean }>()
const emit = defineEmits<{ save: [laps: TimingLap[]] }>()

interface DraftLap {
  time: string
  readerId: string
}

const draft = ref<DraftLap[]>([])

watch(
  () => props.laps,
  (laps) => {
    draft.value = laps.map((lap) => ({ time: String(lap.time), readerId: lap.readerId }))
  },
  { immediate: true },
)

const dirty = computed(() => {
  const current = draft.value.map((lap) => `${lap.readerId}:${lap.time}`).join('|')
  const saved = props.laps.map((lap) => `${lap.readerId}:${lap.time}`).join('|')
  return current !== saved
})

function add() {
  draft.value = [...draft.value, { time: '', readerId: '0' }]
}

function remove(index: number) {
  draft.value = draft.value.filter((_, i) => i !== index)
}

function save() {
  const laps: TimingLap[] = []
  for (const lap of draft.value) {
    const time = Number(lap.time.trim())
    if (!lap.time.trim() || !Number.isFinite(time) || time < 0) return
    laps.push({ time, readerId: lap.readerId || '0' })
  }
  emit('save', laps)
}

const invalid = computed(() =>
  draft.value.some((lap) => {
    const time = Number(lap.time.trim())
    return !lap.time.trim() || !Number.isFinite(time) || time < 0
  }),
)
</script>

<template>
  <div class="laps">
    <div v-for="(lap, index) in draft" :key="index" class="lap">
      <NInput
        v-model:value="lap.time"
        size="small"
        placeholder=""
        :disabled="saving"
        @keydown.enter.prevent="save"
      />
      <span v-if="lap.readerId && lap.readerId !== '0'" class="reader" :title="'Čitač ' + lap.readerId">
        {{ lap.readerId }}
      </span>
      <NButton size="tiny" quaternary :disabled="saving" @click="remove(index)">×</NButton>
    </div>
    <div class="actions">
      <NButton size="tiny" :disabled="saving" @click="add">Dodaj</NButton>
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
  min-width: 180px;
}
.lap {
  display: flex;
  align-items: center;
  gap: 4px;
}
.reader {
  font-size: 11px;
  opacity: 0.7;
}
.actions {
  display: flex;
  gap: 4px;
}
</style>
