<script setup lang="ts">
import type { FieldMeta } from '@stoperica/shared'
import { NTag, NText } from 'naive-ui'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { inputKind } from '@/crud/fields'
import { useMetaStore } from '@/stores/meta'

const props = defineProps<{ field: FieldMeta; row: Record<string, unknown>; compact?: boolean }>()

const metaStore = useMetaStore()
const value = computed(() => props.row[props.field.name])
const kind = computed(() => inputKind(props.field))

const relationLabel = computed(() => {
  const fk = props.field.foreignKeyFor
  if (!fk?.resource) return null
  const target = metaStore.byResource.get(fk.resource)
  const related = props.row[fk.field] as Record<string, unknown> | null | undefined
  return target && related ? String(related[target.displayField] ?? value.value) : String(value.value)
})

const formatted = computed(() => {
  const v = value.value
  if (v === null || v === undefined || v === '') return null
  if (kind.value === 'datetime') return new Date(v as string).toLocaleString('hr-HR')
  if (kind.value === 'json') return JSON.stringify(v, null, props.compact ? 0 : 2)
  return String(v)
})

const isUrl = computed(() => typeof value.value === 'string' && /^https?:\/\//.test(value.value))
</script>

<template>
  <NText v-if="formatted === null && kind !== 'boolean'" depth="3">—</NText>
  <template v-else-if="kind === 'boolean'">
    <NTag v-if="value === true" type="success" size="small" :bordered="false">Da</NTag>
    <NTag v-else-if="value === false" size="small" :bordered="false">Ne</NTag>
    <NText v-else depth="3">—</NText>
  </template>
  <RouterLink
    v-else-if="kind === 'relation'"
    :to="{ name: 'resource-show', params: { resource: field.foreignKeyFor!.resource, id: String(value) } }"
  >
    {{ relationLabel }}
  </RouterLink>
  <pre v-else-if="kind === 'json' && !compact" class="json">{{ formatted }}</pre>
  <a v-else-if="isUrl" :href="formatted!" target="_blank" rel="noopener noreferrer" class="ellipsis">{{ formatted }}</a>
  <span v-else :class="{ ellipsis: compact, prewrap: !compact }">{{ formatted }}</span>
</template>

<style scoped>
.json {
  margin: 0;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}
.ellipsis {
  display: inline-block;
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}
.prewrap {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
