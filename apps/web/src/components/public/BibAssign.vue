<script setup lang="ts">
import type { RaceStartNumberOption } from '@stoperica/shared'
import { NSelect } from 'naive-ui'
import { computed } from 'vue'

const props = defineProps<{
  modelValue: number | null
  options: RaceStartNumberOption[]
  loading?: boolean
}>()

const emit = defineEmits<{ update: [startNumberId: number | null] }>()

const selectOptions = computed(() =>
  props.options.map((option) => {
    const mine = option.id === props.modelValue
    return {
      value: option.id,
      label: option.takenBy && !mine ? `${option.value} · ${option.takenBy}` : option.value,
      disabled: option.takenBy !== null && !mine,
    }
  }),
)

function onUpdate(value: number | null) {
  if (value === props.modelValue) return
  emit('update', value)
}
</script>

<template>
  <NSelect
    class="bib-select"
    size="small"
    :value="modelValue"
    :options="selectOptions"
    :loading="loading"
    :disabled="loading"
    filterable
    clearable
    placeholder="Broj"
    @update:value="onUpdate"
  />
</template>

<style scoped>
.bib-select {
  width: 100%;
  max-width: 148px;
}
</style>
