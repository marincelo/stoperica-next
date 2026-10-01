<script setup lang="ts">
import type { FieldMeta } from '@stoperica/shared'
import { NDatePicker, NInput, NInputNumber, NSelect, NSwitch } from 'naive-ui'
import { computed } from 'vue'
import { inputKind } from '@/crud/fields'
import RelationSelect from './RelationSelect.vue'

const props = defineProps<{ field: FieldMeta; enumValues?: string[]; disabled?: boolean }>()
const model = defineModel<any>()

const kind = computed(() => inputKind(props.field))
const clearable = computed(() => !props.field.isRequired)
const enumOptions = computed(() =>
  props.field.intEnum
    ? props.field.intEnum.map((label, value) => ({ label, value }))
    : (props.enumValues ?? []).map((value) => ({ label: value, value })),
)
</script>

<template>
  <RelationSelect
    v-if="kind === 'relation'"
    v-model="model"
    :resource="field.foreignKeyFor!.resource!"
    :clearable="clearable"
    :disabled="disabled"
  />
  <NSelect
    v-else-if="kind === 'enum'"
    v-model:value="model"
    :options="enumOptions"
    :clearable="clearable"
    :disabled="disabled"
  />
  <NInputNumber
    v-else-if="kind === 'integer'"
    v-model:value="model"
    :precision="0"
    :clearable="clearable"
    :disabled="disabled"
    style="width: 100%"
  />
  <NInputNumber
    v-else-if="kind === 'number'"
    v-model:value="model"
    :clearable="clearable"
    :disabled="disabled"
    style="width: 100%"
  />
  <NSwitch v-else-if="kind === 'boolean'" v-model:value="model" :disabled="disabled" />
  <NDatePicker
    v-else-if="kind === 'datetime'"
    v-model:value="model"
    type="datetime"
    format="dd.MM.yyyy. HH:mm"
    :clearable="clearable"
    :disabled="disabled"
    style="width: 100%"
  />
  <NInput
    v-else-if="kind === 'json'"
    v-model:value="model"
    type="textarea"
    :autosize="{ minRows: 3, maxRows: 16 }"
    placeholder="JSON"
    :disabled="disabled"
    style="font-family: ui-monospace, monospace"
  />
  <NInput
    v-else-if="kind === 'textarea'"
    v-model:value="model"
    type="textarea"
    :autosize="{ minRows: 3, maxRows: 16 }"
    :clearable="clearable"
    :disabled="disabled"
  />
  <NInput v-else v-model:value="model" :clearable="clearable" :disabled="disabled" />
</template>
