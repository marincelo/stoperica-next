<script setup lang="ts">
import type { RaceExportType } from '@stoperica/shared'
import type { DropdownOption } from 'naive-ui'
import { NButton, NDropdown, useMessage } from 'naive-ui'
import { ref } from 'vue'
import { download } from '@/api/http'

const props = defineProps<{ raceId: number }>()
const message = useMessage()
const busy = ref(false)

const option = (key: RaceExportType, label: string): DropdownOption => ({ key, label })

const options: DropdownOption[] = [
  {
    type: 'group',
    key: 'registrations',
    label: 'Prijave',
    children: [option('all', 'Svi podaci'), option('start_list', 'Startna lista')],
  },
  {
    type: 'group',
    key: 'results',
    label: 'Rezultati',
    children: [
      option('results', 'Rezultati'),
      option('results_uci', 'Rezultati s UCI ID-om'),
      option('dataride', 'Rezultati za Dataride'),
    ],
  },
  {
    type: 'group',
    key: 'swim',
    label: 'Plivanje',
    children: [
      option('start_list_swim', 'Startna lista'),
      option('start_list_swim_gender', 'Startna lista po spolu'),
      option('results_swim', 'Rezultati'),
    ],
  },
]

async function onSelect(type: RaceExportType) {
  busy.value = true
  try {
    await download(`/admin/exports/races/${props.raceId}/${type}`, `${type}.xlsx`)
  } catch (e) {
    message.error((e as Error).message)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <NDropdown trigger="click" placement="bottom-start" :options="options" @select="onSelect">
    <NButton secondary :loading="busy" title="Preuzmi Excel (samo administratori)">
      <template #icon>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor" /></svg>
      </template>
      Izvoz
    </NButton>
  </NDropdown>
</template>
