<script setup lang="ts">
import { NButton, NCard, NDescriptions, NDescriptionsItem, NFlex, NPopconfirm, NSpin, useMessage } from 'naive-ui'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { crudApi, type Row } from '@/api/crud'
import ChildTable from '@/components/crud/ChildTable.vue'
import FieldValue from '@/components/crud/FieldValue.vue'
import { displayFieldsOf, displayLabel, valueFields } from '@/crud/fields'
import { fieldLabel } from '@/crud/labels'
import { useResourceMeta } from '@/crud/useResourceMeta'

const { resource, meta } = useResourceMeta()
const route = useRoute()
const router = useRouter()
const message = useMessage()

const id = computed(() => String(route.params.id))
const record = ref<Row | null>(null)
const loading = ref(false)

const title = computed(() => {
  if (!record.value) return meta.value.label
  return displayLabel(record.value, displayFieldsOf(meta.value), `${meta.value.label} #${id.value}`)
})

async function load() {
  loading.value = true
  try {
    record.value = await crudApi.get(resource.value, id.value)
  } catch (error) {
    message.error((error as Error).message)
    record.value = null
  } finally {
    loading.value = false
  }
}

async function remove() {
  try {
    await crudApi.remove(resource.value, id.value)
    message.success('Zapis obrisan')
    router.push({ name: 'resource-list', params: { resource: resource.value } })
  } catch (error) {
    message.error((error as Error).message)
  }
}

watch([resource, id], load, { immediate: true })
</script>

<template>
  <NSpin :show="loading">
    <NFlex vertical :size="16">
      <NCard :title="title">
        <template #header-extra>
          <NFlex :size="8">
            <NButton @click="router.push({ name: 'resource-list', params: { resource } })">Natrag</NButton>
            <NButton type="primary" @click="router.push({ name: 'resource-edit', params: { resource, id } })">
              Uredi
            </NButton>
            <NPopconfirm positive-text="Obriši" negative-text="Odustani" @positive-click="remove">
              <template #trigger>
                <NButton type="error" secondary>Obriši</NButton>
              </template>
              Sigurno obrisati ovaj zapis?
            </NPopconfirm>
          </NFlex>
        </template>

        <NDescriptions v-if="record" :column="1" label-placement="left" bordered label-style="width: 240px">
          <NDescriptionsItem v-for="field in valueFields(meta)" :key="field.name" :label="fieldLabel(meta.name, field.name)">
            <FieldValue :field="field" :row="record" />
          </NDescriptionsItem>
        </NDescriptions>
      </NCard>

      <ChildTable v-for="child in meta.children" :key="child.resource + child.foreignKey" :child="child" :parent-id="id" />
    </NFlex>
  </NSpin>
</template>
