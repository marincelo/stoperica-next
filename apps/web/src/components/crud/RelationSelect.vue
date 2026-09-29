<script setup lang="ts">
import type { OptionItem } from '@stoperica/shared'
import { NSelect } from 'naive-ui'
import { onMounted, ref } from 'vue'
import { crudApi } from '@/api/crud'

const props = defineProps<{ resource: string; clearable?: boolean }>()
const model = defineModel<string | number | null>({ default: null })

const options = ref<OptionItem[]>([])
const loading = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

async function load(query: { search?: string; ids?: string }) {
  loading.value = true
  try {
    const result = await crudApi.options(props.resource, query)
    const selected = options.value.filter((o) => o.value === model.value)
    options.value = [...selected, ...result.filter((o) => !selected.some((s) => s.value === o.value))]
  } finally {
    loading.value = false
  }
}

function onSearch(search: string) {
  clearTimeout(timer)
  timer = setTimeout(() => load({ search }), 250)
}

onMounted(async () => {
  if (model.value !== null && model.value !== undefined) await load({ ids: String(model.value) })
  await load({})
})
</script>

<template>
  <NSelect
    v-model:value="model"
    :options="options"
    :loading="loading"
    :clearable="clearable"
    filterable
    remote
    placeholder="Odaberi…"
    @search="onSearch"
  />
</template>
