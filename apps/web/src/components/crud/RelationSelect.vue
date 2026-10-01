<script setup lang="ts">
import type { OptionItem } from '@stoperica/shared'
import { NSelect } from 'naive-ui'
import { onMounted, ref } from 'vue'
import { crudApi } from '@/api/crud'

const props = defineProps<{ resource: string; clearable?: boolean; disabled?: boolean }>()
const model = defineModel<string | number | null>({ default: null })

const options = ref<OptionItem[]>([])
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    options.value = await crudApi.options(props.resource)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <NSelect
    v-model:value="model"
    :options="options"
    :loading="loading"
    :clearable="clearable"
    :disabled="disabled"
    filterable
    placeholder="Odaberi…"
  />
</template>
